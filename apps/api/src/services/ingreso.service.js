const repo     = require("../repositories/ingreso.repository");
const AppError = require("../errors/AppError");
const { fechaValida, numero, sanitizarTexto, semanaValida } = require("../utils/contabilidad");

function sedeEsPermitida(usuario) {
  return usuario.rol === "Admin" || usuario.rol === "Bodega" || usuario.rol === "AdminBogota";
}

function sedeWhere(usuario) {
  if (usuario && usuario.rol !== "Admin" && usuario.sedeId != null) {
    return { sedeId: usuario.sedeId };
  }
  return {};
}

async function registrar(app, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para registrar ingresos.", 403);
  }

  const fecha = fechaValida(body.fecha);
  const semana = semanaValida(body.semana);
  const efectivo = numero(body.efectivo ?? 0, "valor de efectivo");
  const cuentas = numero(body.cuentas ?? 0, "valor de cuentas");
  if (efectivo <= 0 && cuentas <= 0) throw new AppError("Ingresa al menos un valor en efectivo o cuentas.", 422);

  let sedeId = Number(body.sedeId);
  if (usuario.rol !== "Admin" && sedeId !== usuario.sedeId) {
    throw new AppError("No puedes registrar ingresos en otra sede.", 403);
  }

  const sede = await app.prisma.sede.findUnique({ where: { id: sedeId } });
  if (!sede) throw new AppError(`Sede ${sedeId} no encontrada`, 404);

  const nuevo = await repo.crear(app.prisma, {
    fecha,
    semana,
    sedeId,
    efectivo,
    cuentas,
    total: efectivo + cuentas,
    observacion: sanitizarTexto(body.observacion) || null,
  });

  await registrarAccion(
    app,
    usuario.id,
    "CREAR_INGRESO",
    `Registró un ingreso de ${nuevo.total} (efectivo ${efectivo}, cuentas ${cuentas}) en sede ${sedeId}.`,
  );

  return nuevo;
}

async function obtenerLista(app, query, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para listar ingresos.", 403);
  }

  const filtros = { skip: Number(query.skip ?? 0), take: Number(query.take ?? 50) };
  if (query.fecha)  filtros.fecha  = new Date(query.fecha);
  if (query.semana) filtros.semana = Number(query.semana);
  if (query.concepto) filtros.concepto = query.concepto;

  if (usuario.rol !== "Admin") {
    filtros.sedeId = usuario.sedeId;
  } else if (query.sedeId) {
    filtros.sedeId = Number(query.sedeId);
  }

  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para ver ingresos.", 403);
  }

  const ingreso = await repo.buscarPorId(app.prisma, id);
  if (!ingreso) throw new AppError(`Ingreso ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin" && ingreso.sedeId !== usuario.sedeId) {
    throw new AppError("No tienes permiso para ver este ingreso.", 403);
  }

  return ingreso;
}

async function editar(app, id, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para editar ingresos.", 403);
  }

  const actual = await obtenerPorId(app, id, usuario);
  const data   = {};

  if (body.efectivo !== undefined) data.efectivo = numero(body.efectivo, "valor de efectivo");
  if (body.cuentas !== undefined) data.cuentas = numero(body.cuentas, "valor de cuentas");
  if (body.observacion !== undefined) data.observacion = sanitizarTexto(body.observacion) || null;

  if (data.efectivo !== undefined || data.cuentas !== undefined) {
    data.total = (data.efectivo ?? Number(actual.efectivo)) + (data.cuentas ?? Number(actual.cuentas));
    if (data.efectivo <= 0 && data.cuentas <= 0) throw new AppError("Ingresa al menos un valor en efectivo o cuentas.", 422);
  }

  const actualizado = await repo.actualizar(app.prisma, id, data);
  await registrarAccion(
    app,
    usuario.id,
    "EDITAR_INGRESO",
    `Editó el ingreso #${id}.`,
  );
  return actualizado;
}

async function borrar(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para eliminar ingresos.", 403);
  }

  await obtenerPorId(app, id, usuario);
  const resultado = await repo.eliminar(app.prisma, id);
  await registrarAccion(
    app,
    usuario.id,
    "ELIMINAR_INGRESO",
    `Eliminó el ingreso #${id}.`,
  );
  return resultado;
}

async function resumenPorSede(app, semana, usuario) {
  const where = sedeWhere(usuario);
  const filas = await repo.resumenPorSede(app.prisma, semanaValida(semana), where.sedeId);
  const sedes = usuario.rol !== "Admin" && usuario.sedeId != null
    ? [{ id: usuario.sedeId, nombre: `Sede ${usuario.sedeId}` }]
    : await app.prisma.sede.findMany({ select: { id: true, nombre: true } });
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

async function totalesPorDia(app, semana, usuario) {
  const where = sedeWhere(usuario);
  return repo.totalesPorDia(app.prisma, semanaValida(semana), where.sedeId);
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenPorSede, totalesPorDia };
