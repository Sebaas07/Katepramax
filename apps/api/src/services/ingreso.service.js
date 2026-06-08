

const repo     = require("../repositories/ingreso.repository");
const AppError = require("../errors/AppError");

async function registrar(app, body) {
  const sede = await app.prisma.sede.findUnique({ where: { id: body.sedeId } });
  if (!sede) throw new AppError(`Sede ${body.sedeId} no encontrada`, 404);

  // total siempre calculado en servidor
  const efectivo = Number(body.efectivo ?? 0);
  const cuentas  = Number(body.cuentas  ?? 0);

  return repo.crear(app.prisma, {
    fecha:       new Date(body.fecha),
    semana:      body.semana,
    sedeId:      body.sedeId,
    efectivo,
    cuentas,
    total:       efectivo + cuentas,
    observacion: body.observacion ?? null,
  });
}

async function obtenerLista(app, query) {
  const filtros = { skip: Number(query.skip ?? 0), take: Number(query.take ?? 50) };
  if (query.fecha)  filtros.fecha  = new Date(query.fecha);
  if (query.semana) filtros.semana = Number(query.semana);
  if (query.sedeId) filtros.sedeId = Number(query.sedeId);
  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id) {
  const ingreso = await repo.buscarPorId(app.prisma, id);
  if (!ingreso) throw new AppError(`Ingreso ${id} no encontrado`, 404);
  return ingreso;
}

async function editar(app, id, body) {
  const actual = await obtenerPorId(app, id);
  const data   = {};

  if (body.efectivo    !== undefined) data.efectivo    = Number(body.efectivo);
  if (body.cuentas     !== undefined) data.cuentas     = Number(body.cuentas);
  if (body.observacion !== undefined) data.observacion = body.observacion;

  // Recalcular total si cambió alguno de los dos
  if (data.efectivo !== undefined || data.cuentas !== undefined) {
    data.total = (data.efectivo ?? Number(actual.efectivo)) +
                 (data.cuentas  ?? Number(actual.cuentas));
  }

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
    efectivo:  f._sum.efectivo,
    cuentas:   f._sum.cuentas,
    total:     f._sum.total,
  }));

  const totalGeneral = porSede.reduce(
    (acc, s) => ({
      efectivo: acc.efectivo + Number(s.efectivo ?? 0),
      cuentas:  acc.cuentas  + Number(s.cuentas  ?? 0),
      total:    acc.total    + Number(s.total     ?? 0),
    }),
    { efectivo: 0, cuentas: 0, total: 0 },
  );

  return { porSede, totalGeneral };
}

async function totalesPorDia(app, semana) {
  return repo.totalesPorDia(app.prisma, semana);
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenPorSede, totalesPorDia };
