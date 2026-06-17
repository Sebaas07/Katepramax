const repo     = require("../repositories/cartera.repository");
const AppError = require("../errors/AppError");
const { calcularVariacion, fechaValida, numeroPositivo, semanaValida } = require("../utils/contabilidad");

async function registrar(app, body) {
  const sede = await app.prisma.sede.findUnique({ where: { id: body.sedeId } });
  if (!sede) throw new AppError(`Sede ${body.sedeId} no encontrada`, 404);

  const fecha = fechaValida(body.fecha);
  const saldoDia = numeroPositivo(body.saldoDia, "saldo de cartera");
  const { saldoAnterior } = await calcularVariacion(app.prisma, body.sedeId, fecha);
  const variacion = saldoDia - saldoAnterior;

  const data = {
    fecha,
    semana: semanaValida(body.semana),
    sedeId: body.sedeId,
    saldoDia,
    saldoAnterior,
    variacion,
  };

  try {
    return await repo.crear(app.prisma, data);
  } catch (error) {
    if (error?.code === "P2002") {
      return repo.actualizarPorSedeFecha(app.prisma, body.sedeId, fecha, data);
    }
    throw error;
  }
}

async function obtenerLista(app, query) {
  const filtros = { skip: Number(query.skip ?? 0), take: Number(query.take ?? 50) };
  if (query.fecha)  filtros.fecha  = new Date(query.fecha);
  if (query.semana) filtros.semana = Number(query.semana);
  if (query.sedeId) filtros.sedeId = Number(query.sedeId);
  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id) {
  const cartera = await repo.buscarPorId(app.prisma, id);
  if (!cartera) throw new AppError(`Cartera ${id} no encontrada`, 404);
  return cartera;
}

async function editar(app, id, body) {
  const actual = await obtenerPorId(app, id);

  const data = {};
  if (body.sedeId !== undefined) {
  if (!body.sedeId) throw new AppError("Selecciona la sede.", 422);
  const sede = await app.prisma.sede.findUnique({ where: { id: body.sedeId } });
    if (!sede) throw new AppError(`Sede ${body.sedeId} no encontrada`, 404);
    data.sedeId = body.sedeId;
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

  try {
    return await repo.actualizar(app.prisma, id, data);
  } catch (error) {
    if (error?.code === "P2002") throw new AppError("Ya existe un saldo de cartera para esta sede y fecha.", 409);
    throw error;
  }
}

async function borrar(app, id) {
  await obtenerPorId(app, id);
  return repo.eliminar(app.prisma, id);
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar };
