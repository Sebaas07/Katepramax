const repo  = require("../repositories/inventario.repository");
const AppError = require("../errors/AppError");

/**
 * inventario.service.js
 * Lógica de negocio del módulo Inventario.
 * Recibe el objeto `app` (Fastify) para acceder a app.prisma.
 */

async function registrar(app, body) {
  // Verificar que la sede exista
  const sede = await app.prisma.sede.findUnique({ where: { id: body.sedeId } });
  if (!sede) throw new AppError(`Sede ${body.sedeId} no encontrada`, 404);

  return repo.crear(app.prisma, {
    fecha:    new Date(body.fecha),
    semana:   body.semana,
    sedeId:   body.sedeId,
    cantidad: body.cantidad,
    costo:    body.costo,
  });
}

async function obtenerLista(app, query) {
  const filtros = {
    skip:  Number(query.skip  ?? 0),
    take:  Number(query.take  ?? 50),
  };
  if (query.fecha)  filtros.fecha  = new Date(query.fecha);
  if (query.semana) filtros.semana = Number(query.semana);
  if (query.sedeId) filtros.sedeId = Number(query.sedeId);
  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id) {
  const registro = await repo.buscarPorId(app.prisma, id);
  if (!registro) throw new AppError(`Registro de inventario ${id} no encontrado`, 404);
  return registro;
}

async function editar(app, id, body) {
  await obtenerPorId(app, id); // valida existencia
  return repo.actualizar(app.prisma, id, body);
}

async function borrar(app, id) {
  await obtenerPorId(app, id);
  return repo.eliminar(app.prisma, id);
}

async function resumenSemanal(app, semana) {
  const filas = await repo.resumenSemanal(app.prisma, semana);
  // Enriquecer con nombre de sede
  const sedes = await app.prisma.sede.findMany({ select: { id: true, nombre: true } });
  const mapaS = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));

  return filas.map((f) => ({
    sede:     mapaS[f.sedeId] ?? `Sede ${f.sedeId}`,
    sedeId:   f.sedeId,
    cantidad: f._sum.cantidad,
    costo:    f._sum.costo,
    ultimaFecha: f._max.fecha,
  }));
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenSemanal };
