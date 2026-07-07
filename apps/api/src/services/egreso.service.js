const repo     = require("../repositories/egreso.repository");
const AppError = require("../errors/AppError");
const { fechaValida, numeroPositivo, sanitizarTexto, semanaValida } = require("../utils/contabilidad");
const { registrarAccion } = require("../utils/logger");

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
    throw new AppError("No tienes permiso para registrar egresos.", 403);
  }

  const concepto = sanitizarTexto(body.concepto, 200);
  if (!concepto) throw new AppError("El concepto es obligatorio.", 422);

  let sedeId = Number(body.sedeId);
  if (usuario.rol !== "Admin" && sedeId !== usuario.sedeId) {
    throw new AppError("No puedes registrar egresos en otra sede.", 403);
  }

  const sede = await app.prisma.sede.findUnique({ where: { id: sedeId } });
  if (!sede) throw new AppError(`Sede ${sedeId} no encontrada`, 404);

  const nuevo = await repo.crear(app.prisma, {
    fecha: fechaValida(body.fecha),
    semana: semanaValida(body.semana),
    sedeId,
    concepto,
    total: numeroPositivo(body.total, "total"),
    observacion: sanitizarTexto(body.observacion) || null,
  });

  await registrarAccion(
    app,
    usuario.id,
    "CREAR_EGRESO",
    `Registró un egreso de ${nuevo.total} en concepto "${nuevo.concepto}" (sede ${sedeId}).`,
  );

  return nuevo;
}

async function obtenerLista(app, query, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para listar egresos.", 403);
  }

  const filtros = { skip: Number(query.skip ?? 0), take: Number(query.take ?? 50) };
  if (query.fecha)    filtros.fecha    = new Date(query.fecha);
  if (query.semana)   filtros.semana   = Number(query.semana);
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
    throw new AppError("No tienes permiso para ver egresos.", 403);
  }

  const egreso = await repo.buscarPorId(app.prisma, id);
  if (!egreso) throw new AppError(`Egreso ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin" && egreso.sedeId !== usuario.sedeId) {
    throw new AppError("No tienes permiso para ver este egreso.", 403);
  }

  return egreso;
}

async function editar(app, id, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para editar egresos.", 403);
  }

  await obtenerPorId(app, id, usuario);
  const data = {};
  if (body.concepto !== undefined) {
    const concepto = sanitizarTexto(body.concepto, 200);
    if (!concepto) throw new AppError("El concepto es obligatorio.", 422);
    data.concepto = concepto;
  }
  if (body.total !== undefined) data.total = numeroPositivo(body.total, "total");
  if (body.observacion !== undefined) data.observacion = sanitizarTexto(body.observacion) || null;
  const actualizado = await repo.actualizar(app.prisma, id, data);
  await registrarAccion(
    app,
    usuario.id,
    "EDITAR_EGRESO",
    `Editó el egreso #${id}.`,
  );
  return actualizado;
}

async function borrar(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para eliminar egresos.", 403);
  }

  await obtenerPorId(app, id, usuario);
  const resultado = await repo.eliminar(app.prisma, id);
  await registrarAccion(
    app,
    usuario.id,
    "ELIMINAR_EGRESO",
    `Eliminó el egreso #${id}.`,
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
    total:     Number(f._sum.total),
  }));
  const totalGeneral = porSede.reduce((acc, s) => acc + Number(s.total ?? 0), 0);
  return { porSede, totalGeneral };
}

async function resumenPorConcepto(app, semana, usuario) {
  const where = sedeWhere(usuario);
  const filas = await repo.resumenPorConcepto(app.prisma, semanaValida(semana), where.sedeId);
  return filas.map((f) => ({ concepto: f.concepto, registros: f._count.id, total: Number(f._sum.total) }));
}

async function totalesPorDia(app, semana, usuario) {
  const where = sedeWhere(usuario);
  return repo.totalesPorDia(app.prisma, semanaValida(semana), where.sedeId);
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenPorSede, resumenPorConcepto, totalesPorDia };
