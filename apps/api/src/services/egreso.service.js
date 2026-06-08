

const repo     = require("../repositories/egreso.repository");
const AppError = require("../errors/AppError");

async function registrar(app, body) {
  const sede = await app.prisma.sede.findUnique({ where: { id: body.sedeId } });
  if (!sede) throw new AppError(`Sede ${body.sedeId} no encontrada`, 404);

  return repo.crear(app.prisma, {
    fecha:       new Date(body.fecha),
    semana:      body.semana,
    sedeId:      body.sedeId,
    concepto:    body.concepto,
    total:       Number(body.total),
    observacion: body.observacion ?? null,
  });
}

async function obtenerLista(app, query) {
  const filtros = { skip: Number(query.skip ?? 0), take: Number(query.take ?? 50) };
  if (query.fecha)    filtros.fecha    = new Date(query.fecha);
  if (query.semana)   filtros.semana   = Number(query.semana);
  if (query.sedeId)   filtros.sedeId   = Number(query.sedeId);
  if (query.concepto) filtros.concepto = query.concepto;
  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id) {
  const egreso = await repo.buscarPorId(app.prisma, id);
  if (!egreso) throw new AppError(`Egreso ${id} no encontrado`, 404);
  return egreso;
}

async function editar(app, id, body) {
  await obtenerPorId(app, id);
  const data = {};
  if (body.concepto    !== undefined) data.concepto    = body.concepto;
  if (body.total       !== undefined) data.total       = Number(body.total);
  if (body.observacion !== undefined) data.observacion = body.observacion;
  return repo.actualizar(app.prisma, id, data);
}

async function borrar(app, id) {
  await obtenerPorId(app, id);
  return repo.eliminar(app.prisma, id);
}

async function resumenPorSede(app, semana) {
  const filas = await repo.resumenPorSede(app.prisma, semana);
  const sedes = await app.prisma.sede.findMany({ select: { id: true, nombre: true } });
  const mapa  = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));
  const porSede = filas.map((f) => ({
    sede:      mapa[f.sedeId] ?? `Sede ${f.sedeId}`,
    sedeId:    f.sedeId,
    registros: f._count.id,
    total:     f._sum.total,
  }));
  const totalGeneral = porSede.reduce((acc, s) => acc + Number(s.total ?? 0), 0);
  return { porSede, totalGeneral };
}

async function resumenPorConcepto(app, semana) {
  const filas = await repo.resumenPorConcepto(app.prisma, semana);
  return filas.map((f) => ({ concepto: f.concepto, registros: f._count.id, total: f._sum.total }));
}

async function totalesPorDia(app, semana) {
  return repo.totalesPorDia(app.prisma, semana);
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenPorSede, resumenPorConcepto, totalesPorDia };
