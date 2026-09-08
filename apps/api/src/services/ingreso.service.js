const repo     = require("../repositories/ingreso.repository");
const AppError = require("../errors/AppError");
const { fechaValida, numero, rangoDia, sanitizarTexto, semanaValida, sedeEsPermitida, sedeWhere, resolverFamiliaSede } = require("../utils/contabilidad");
const { registrarAccion } = require("../utils/logger");

async function registrar(app, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para registrar ingresos.", 403);
  }

  const fecha = fechaValida(body.fecha);
  const semana = semanaValida(body.semana);
  const efectivo = numero(body.efectivo ?? 0, "valor de efectivo");
  const cuentas = numero(body.cuentas ?? 0, "valor de cuentas");
  if (efectivo <= 0 && cuentas <= 0) throw new AppError("Ingresa al menos un valor en efectivo o cuentas.", 422);

  if (body.sedeId === undefined || body.sedeId === null || String(body.sedeId).trim() === "") {
    throw new AppError("La sede es obligatoria para registrar un ingreso.", 422);
  }

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

/** IDs de sede visibles en contabilidad (familia bodega + oficinas). */
async function idsFamiliaContable(prisma, usuario) {
  if (!usuario || usuario.rol === "Admin" || usuario.sedeId == null) return null;
  const familia = await resolverFamiliaSede(prisma, usuario.sedeId);
  const ids = familia.map((s) => s.id);
  return ids.length > 0 ? ids : [usuario.sedeId];
}

async function obtenerLista(app, query, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para listar ingresos.", 403);
  }

  const filtros = { skip: Number(query.skip ?? 0), take: Number(query.take ?? 50) };
  if (query.fecha)  filtros.fecha  = rangoDia(query.fecha);
  if (query.semana) filtros.semana = semanaValida(query.semana);
  if (query.concepto) filtros.concepto = query.concepto;

  if (usuario.rol !== "Admin") {
    // Misma familia que clientes: oficinista de Bogotá Centro ve también
    // ingresos registrados en la bodega Bogotá (p. ej. abonos de clientes).
    const ids = await idsFamiliaContable(app.prisma, usuario);
    if (ids && ids.length > 1) filtros.sedeIds = ids;
    else if (ids && ids.length === 1) filtros.sedeId = ids[0];
    else filtros.sedeId = usuario.sedeId;
  } else if (query.sedeId) {
    const ids = (await resolverFamiliaSede(app.prisma, query.sedeId)).map((s) => s.id);
    if (ids.length === 1)      filtros.sedeId = ids[0];
    else if (ids.length > 1)   filtros.sedeIds = ids;
    else                       filtros.sedeId = Number(query.sedeId);
  }

  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para ver ingresos.", 403);
  }

  const ingreso = await repo.buscarPorId(app.prisma, id);
  if (!ingreso) throw new AppError(`Ingreso ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin") {
    const ids = await idsFamiliaContable(app.prisma, usuario);
    const ok = ids && ids.length > 0
      ? ids.includes(ingreso.sedeId)
      : ingreso.sedeId === usuario.sedeId;
    if (!ok) {
      throw new AppError("No tienes permiso para ver este ingreso.", 403);
    }
  }

  return ingreso;
}

async function editar(app, id, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para editar ingresos.", 403);
  }

  const actual = await obtenerPorId(app, id, usuario);
  if (actual.origen && actual.origen !== "manual") {
    throw new AppError("Los ingresos automáticos se corrigen desde el módulo que los generó.", 409);
  }
  const data   = {};

  if (body.efectivo !== undefined) data.efectivo = numero(body.efectivo, "valor de efectivo");
  if (body.cuentas !== undefined) data.cuentas = numero(body.cuentas, "valor de cuentas");
  if (body.observacion !== undefined) data.observacion = sanitizarTexto(body.observacion) || null;

  if (data.efectivo !== undefined || data.cuentas !== undefined) {
    const efectivoFinal = data.efectivo ?? Number(actual.efectivo);
    const cuentasFinal  = data.cuentas  ?? Number(actual.cuentas);
    data.total = efectivoFinal + cuentasFinal;
    if (efectivoFinal <= 0 && cuentasFinal <= 0) throw new AppError("Ingresa al menos un valor en efectivo o cuentas.", 422);
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

  const actual = await obtenerPorId(app, id, usuario);
  if (actual.origen && actual.origen !== "manual") {
    throw new AppError("Los ingresos automáticos no se pueden eliminar desde Contabilidad.", 409);
  }
  const resultado = await repo.eliminar(app.prisma, id);
  await registrarAccion(
    app,
    usuario.id,
    "ELIMINAR_INGRESO",
    `Eliminó el ingreso #${id}.`,
  );
  return resultado;
}

async function whereResumen(app, usuario, sedeId) {
  if (usuario.rol === "Admin") {
    if (!sedeId) return {};
    const ids = (await resolverFamiliaSede(app.prisma, sedeId)).map((s) => s.id);
    if (ids.length > 1) return { sedeIds: ids };
    return { sedeId: ids[0] ?? Number(sedeId) };
  }
  const ids = await idsFamiliaContable(app.prisma, usuario);
  if (ids && ids.length > 1) return { sedeIds: ids };
  if (ids && ids.length === 1) return { sedeId: ids[0] };
  return sedeWhere(usuario);
}

async function resumenPorSede(app, semana, usuario, sedeId) {
  const where = await whereResumen(app, usuario, sedeId);
  const filas = await repo.resumenPorSede(
    app.prisma,
    semanaValida(semana),
    where.sedeId,
  );
  // Si el resumen nativo solo acepta sedeId único, filtramos en memoria cuando hay familia
  let filasFinal = filas;
  if (where.sedeIds?.length) {
    filasFinal = filas.filter((f) => where.sedeIds.includes(f.sedeId));
  }

  const sedes = await app.prisma.sede.findMany({ select: { id: true, nombre: true } });
  const mapa  = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));

  const porSede = filasFinal.map((f) => ({
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

async function totalesPorDia(app, semana, usuario, sedeId) {
  const where = await whereResumen(app, usuario, sedeId);
  return repo.totalesPorDia(app.prisma, semanaValida(semana), where.sedeId);
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenPorSede, totalesPorDia };
