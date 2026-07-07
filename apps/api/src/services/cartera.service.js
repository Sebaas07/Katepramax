const repo     = require("../repositories/cartera.repository");
const AppError = require("../errors/AppError");
const { calcularVariacion, fechaValida, numeroPositivo, semanaValida } = require("../utils/contabilidad");
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
    throw new AppError("No tienes permiso para registrar cartera.", 403);
  }

  let sedeId = Number(body.sedeId);
  if (usuario.rol !== "Admin" && sedeId !== usuario.sedeId) {
    throw new AppError("No puedes registrar cartera en otra sede.", 403);
  }

  const sede = await app.prisma.sede.findUnique({ where: { id: sedeId } });
  if (!sede) throw new AppError(`Sede ${sedeId} no encontrada`, 404);

  const fecha = fechaValida(body.fecha);
  const saldoDia = numeroPositivo(body.saldoDia, "saldo de cartera");
  const { saldoAnterior } = await calcularVariacion(app.prisma, sedeId, fecha);
  const variacion = saldoDia - saldoAnterior;

  const data = {
    fecha,
    semana: semanaValida(body.semana),
    sedeId,
    saldoDia,
    saldoAnterior,
    variacion,
  };

  let resultado;
  try {
    resultado = await repo.crear(app.prisma, data);
  } catch (error) {
    if (error?.code === "P2002") {
      resultado = await repo.actualizarPorSedeFecha(app.prisma, sedeId, fecha, data);
    } else {
      throw error;
    }
  }

  await registrarAccion(
    app,
    usuario.id,
    "REGISTRAR_CARTERA",
    `Registró cartera de ${saldoDia} en sede ${sedeId} (${fecha.toISOString().slice(0, 10)}).`,
  );

  return resultado;
}

async function obtenerLista(app, query, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para listar cartera.", 403);
  }

  const filtros = { skip: Number(query.skip ?? 0), take: Number(query.take ?? 50) };
  if (query.fecha)  filtros.fecha  = new Date(query.fecha);
  if (query.semana) filtros.semana = Number(query.semana);

  if (usuario.rol !== "Admin") {
    filtros.sedeId = usuario.sedeId;
  } else if (query.sedeId) {
    filtros.sedeId = Number(query.sedeId);
  }

  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para ver cartera.", 403);
  }

  const cartera = await repo.buscarPorId(app.prisma, id);
  if (!cartera) throw new AppError(`Cartera ${id} no encontrada`, 404);

  if (usuario.rol !== "Admin" && cartera.sedeId !== usuario.sedeId) {
    throw new AppError("No tienes permiso para ver este registro de cartera.", 403);
  }

  return cartera;
}

async function editar(app, id, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para editar cartera.", 403);
  }

  const actual = await obtenerPorId(app, id, usuario);
  const data = {};

  if (body.sedeId !== undefined) {
    let sedeId = Number(body.sedeId);
    if (!sedeId) throw new AppError("Selecciona la sede.", 422);
    const sede = await app.prisma.sede.findUnique({ where: { id: sedeId } });
    if (!sede) throw new AppError(`Sede ${sedeId} no encontrada`, 404);
    if (usuario.rol !== "Admin" && sedeId !== usuario.sedeId) {
      throw new AppError("No puedes cambiar la sede de cartera.", 403);
    }
    data.sedeId = sedeId;
  }

  const fecha = body.fecha ? fechaValida(body.fecha) : actual.fecha;
  const sedeId = data.sedeId ?? actual.sedeId;
  const saldoDia = body.saldoDia !== undefined ? numeroPositivo(body.saldoDia, "saldo de cartera") : Number(actual.saldoDia);

  const { saldoAnterior } = await calcularVariacion(app.prisma, sedeId, fecha, id);
  data.fecha = fecha;
  data.semana = semanaValida(body.semana ?? actual.semana);
  data.saldoDia = saldoDia;
  data.saldoAnterior = saldoAnterior;
  data.variacion = saldoDia - saldoAnterior;

  let actualizado;
  try {
    actualizado = await repo.actualizar(app.prisma, id, data);
  } catch (error) {
    if (error?.code === "P2002") throw new AppError("Ya existe un saldo de cartera para esta sede y fecha.", 409);
    throw error;
  }

  await registrarAccion(
    app,
    usuario.id,
    "EDITAR_CARTERA",
    `Editó el registro de cartera #${id}.`,
  );

  return actualizado;
}

async function borrar(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para eliminar cartera.", 403);
  }

  await obtenerPorId(app, id, usuario);
  const resultado = await repo.eliminar(app.prisma, id);
  await registrarAccion(
    app,
    usuario.id,
    "ELIMINAR_CARTERA",
    `Eliminó el registro de cartera #${id}.`,
  );
  return resultado;
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar };
