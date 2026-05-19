const repo     = require("../repositories/inventario.repository");
const AppError = require("../errors/AppError");

/**
 * inventario.service.js
 * Lógica de negocio del módulo Inventario.
 * Recibe el objeto `app` (Fastify) para acceder a app.prisma.
 */

async function registrar(app, body) {
  const sede = await app.prisma.sede.findUnique({ where: { id: body.sedeId } });
  if (!sede) throw new AppError(`Sede ${body.sedeId} no encontrada`, 404);

  const producto = await app.prisma.producto.findUnique({ where: { codigo: body.productoId } });
  if (!producto) throw new AppError(`Producto ${body.productoId} no encontrado`, 404);

  const registro = await repo.crear(app.prisma, {
    fecha:             new Date(body.fecha),
    semana:            body.semana,
    sedeId:            body.sedeId,
    productoId:        body.productoId,
    cantidadIngresada: body.cantidadIngresada,
    costo:             body.costo,
  });

  // Actualizar stock acumulado
  await app.prisma.stockSede.upsert({
    where:  { sedeId_productoId: { sedeId: body.sedeId, productoId: body.productoId } },
    update: { stockActual: { increment: body.cantidadIngresada } },
    create: { sedeId: body.sedeId, productoId: body.productoId, stockActual: body.cantidadIngresada },
  });

  return registro;
}

async function obtenerLista(app, query) {
  const filtros = {
    skip: Number(query.skip ?? 0),
    take: Number(query.take ?? 50),
  };
  if (query.fecha)      filtros.fecha      = new Date(query.fecha);
  if (query.semana)     filtros.semana     = Number(query.semana);
  if (query.sedeId)     filtros.sedeId     = Number(query.sedeId);
  if (query.productoId) filtros.productoId = query.productoId;
  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id) {
  const registro = await repo.buscarPorId(app.prisma, id);
  if (!registro) throw new AppError(`Registro de inventario ${id} no encontrado`, 404);
  return registro;
}

async function editar(app, id, body) {
  const registroAnterior = await obtenerPorId(app, id);

  const actualizado = await repo.actualizar(app.prisma, id, body);

  // Si cambió cantidadIngresada, recalcular el delta en StockSede
  if (body.cantidadIngresada !== undefined) {
    const delta = body.cantidadIngresada - registroAnterior.cantidadIngresada;
    await app.prisma.stockSede.upsert({
      where:  { sedeId_productoId: { sedeId: registroAnterior.sedeId, productoId: registroAnterior.productoId } },
      update: { stockActual: { increment: delta } },
      create: { sedeId: registroAnterior.sedeId, productoId: registroAnterior.productoId, stockActual: delta },
    });
  }

  return actualizado;
}

async function borrar(app, id) {
  const registro = await obtenerPorId(app, id);
  await repo.eliminar(app.prisma, id);

  // Revertir el stock al eliminar el registro
  await app.prisma.stockSede.update({
    where: { sedeId_productoId: { sedeId: registro.sedeId, productoId: registro.productoId } },
    data:  { stockActual: { decrement: registro.cantidadIngresada } },
  });
}

async function resumenSemanal(app, semana) {
  const filas = await repo.resumenSemanal(app.prisma, semana);
  const sedes = await app.prisma.sede.findMany({ select: { id: true, nombre: true } });
  const mapaS = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));

  return filas.map((f) => ({
    sede:        mapaS[f.sedeId] ?? `Sede ${f.sedeId}`,
    sedeId:      f.sedeId,
    cantidad:    f._sum.cantidadIngresada,
    costo:       f._sum.costo,
    ultimaFecha: f._max.fecha,
  }));
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenSemanal };
