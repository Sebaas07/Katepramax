const repo = require("../repositories/inventario.repository");
const AppError = require("../errors/AppError");

async function registrar(app, body) {
  const sede = await app.prisma.sede.findUnique({ where: { id: body.sedeId } });
  if (!sede) throw new AppError(`Sede ${body.sedeId} no encontrada`, 404);

  const producto = await app.prisma.producto.findUnique({
    where: { codigo: body.productoId },
  });
  if (!producto)
    throw new AppError(`Producto "${body.productoId}" no encontrado`, 404);
  if (!producto.activo)
    throw new AppError(`Producto "${body.productoId}" está inactivo`, 422);

  const fecha = new Date(body.fecha);
  fecha.setUTCHours(0, 0, 0, 0);

  const tipo = body.tipo ?? "entrada";
  const cantidad = Number(body.cantidadIngresada);
  const costoUnitarioRegistro =
    body.costoUnitario ?? Number(producto.precioCosto);

  // Delta según tipo — salida resta, ajuste puede ser negativo, entrada suma
  const delta =
    tipo === "salida"
      ? -Math.abs(cantidad)
      : tipo === "ajuste"
        ? cantidad
        : Math.abs(cantidad);

  const registro = await repo.crear(app.prisma, {
    fecha,
    semana: body.semana,
    sedeId: body.sedeId,
    productoId: body.productoId,
    cantidadIngresada: delta,
    costoUnitario: costoUnitarioRegistro,
    tipo,
    nota: body.nota ?? null,
  });

  await app.prisma.stockSede.upsert({
    where: {
      sedeId_productoId: { sedeId: body.sedeId, productoId: body.productoId },
    },
    update: { stockActual: { increment: delta } },
    create: {
      sedeId: body.sedeId,
      productoId: body.productoId,
      stockActual: Math.max(0, delta),
    },
  });

  return registro;
}

async function obtenerLista(app, query) {
  const filtros = {
    skip: Number(query.skip ?? 0),
    take: Number(query.take ?? 50),
  };
  if (query.fecha) filtros.fecha = new Date(query.fecha);
  if (query.semana) filtros.semana = Number(query.semana);
  if (query.sedeId) filtros.sedeId = Number(query.sedeId);
  if (query.productoId) filtros.productoId = query.productoId;
  if (query.tipo) filtros.tipo = query.tipo;
  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id) {
  const registro = await repo.buscarPorId(app.prisma, id);
  if (!registro)
    throw new AppError(`Registro de inventario ${id} no encontrado`, 404);
  return registro;
}

async function editar(app, id, body) {
  const anterior = await obtenerPorId(app, id);
  const actualizado = await repo.actualizar(app.prisma, id, body);

  if (body.cantidadIngresada !== undefined) {
    const delta = body.cantidadIngresada - anterior.cantidadIngresada;
    await app.prisma.stockSede.upsert({
      where: {
        sedeId_productoId: {
          sedeId: anterior.sedeId,
          productoId: anterior.productoId,
        },
      },
      update: { stockActual: { increment: delta } },
      create: {
        sedeId: anterior.sedeId,
        productoId: anterior.productoId,
        stockActual: Math.max(0, delta),
      },
    });
  }

  return actualizado;
}

async function borrar(app, id) {
  const registro = await obtenerPorId(app, id);
  await repo.eliminar(app.prisma, id);

  // Revertir el stock (delta negativo del registro)
  await app.prisma.stockSede.update({
    where: {
      sedeId_productoId: {
        sedeId: registro.sedeId,
        productoId: registro.productoId,
      },
    },
    data: { stockActual: { decrement: registro.cantidadIngresada } },
  });
}

async function resumenSemanal(app, semana) {
  const filas = await repo.resumenSemanal(app.prisma, semana);
  const [sedes, productos] = await Promise.all([
    app.prisma.sede.findMany({ select: { id: true, nombre: true } }),
    app.prisma.producto.findMany({
      select: { codigo: true, descripcion: true },
    }),
  ]);
  const mapaSede = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));
  const mapaProducto = Object.fromEntries(
    productos.map((p) => [p.codigo, p.descripcion]),
  );

  return filas.map((f) => ({
    sede: mapaSede[f.sedeId] ?? `Sede ${f.sedeId}`,
    sedeId: f.sedeId,
    producto: mapaProducto[f.productoId] ?? f.productoId,
    productoId: f.productoId,
    cantidad: f._sum.cantidadIngresada,
    costo: f._sum.costoUnitario,
    ultimaFecha: f._max.fecha,
  }));
}

module.exports = {
  registrar,
  obtenerLista,
  obtenerPorId,
  editar,
  borrar,
  resumenSemanal,
};
