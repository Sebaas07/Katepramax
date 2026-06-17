const repo     = require("../repositories/ingreso.repository");
const AppError = require("../errors/AppError");
const { fechaValida, numero, sanitizarTexto, semanaValida } = require("../utils/contabilidad");

async function registrar(app, body) {
  const fecha = fechaValida(body.fecha);
  const semana = semanaValida(body.semana);
  const efectivo = numero(body.efectivo ?? 0, "valor de efectivo");
  const cuentas = numero(body.cuentas ?? 0, "valor de cuentas");
  if (efectivo <= 0 && cuentas <= 0) throw new AppError("Ingresa al menos un valor en efectivo o cuentas.", 422);

  if (!body.sedeId) throw new AppError("Selecciona la sede.", 422);
  const sede = await app.prisma.sede.findUnique({ where: { id: body.sedeId } });
  if (!sede) throw new AppError(`Sede ${body.sedeId} no encontrada`, 404);

  return repo.crear(app.prisma, {
    fecha,
    semana,
    sedeId: body.sedeId,
    efectivo,
    cuentas,
    total: efectivo + cuentas,
    observacion: sanitizarTexto(body.observacion) || null,
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

  if (body.efectivo !== undefined) data.efectivo = numero(body.efectivo, "valor de efectivo");
  if (body.cuentas !== undefined) data.cuentas = numero(body.cuentas, "valor de cuentas");
  if (body.observacion !== undefined) data.observacion = sanitizarTexto(body.observacion) || null;

  if (data.efectivo !== undefined || data.cuentas !== undefined) {
    data.total = (data.efectivo ?? Number(actual.efectivo)) + (data.cuentas ?? Number(actual.cuentas));
    if (data.efectivo <= 0 && data.cuentas <= 0) throw new AppError("Ingresa al menos un valor en efectivo o cuentas.", 422);
  }

  return repo.actualizar(app.prisma, id, data);
}

async function borrar(app, id) {
  await obtenerPorId(app, id);
  return repo.eliminar(app.prisma, id);
}

async function resumenPorSede(app, semana) {
  const filas = await repo.resumenPorSede(app.prisma, semanaValida(semana));
  const sedes = await app.prisma.sede.findMany({ select: { id: true, nombre: true } });
  const mapa  = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));

  const porSede = filas.map((f) => ({
    sede:      mapa[f.sedeId] ?? `Sede ${f.sedeId}`,
    sedeId:    f.sedeId,
    registros: f._count.id,
    efectivo:  Number(f._sum.efectivo),
    cuentas:   Number(f._sum.cuentas),
    total:     Number(f._sum.total),
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
  return repo.totalesPorDia(app.prisma, semanaValida(semana));
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenPorSede, totalesPorDia };
