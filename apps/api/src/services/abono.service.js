

const repo     = require("../repositories/abono.repository");
const AppError = require("../errors/AppError");

async function registrar(app, body) {
  const proveedor = await app.prisma.proveedor.findUnique({ where: { id: body.proveedorId } });
  if (!proveedor) throw new AppError(`Proveedor ${body.proveedorId} no encontrado`, 404);
  if (!proveedor.activo) throw new AppError(`Proveedor "${proveedor.nombre}" está inactivo`, 422);

  const sede = await app.prisma.sede.findUnique({ where: { id: body.sedeId } });
  if (!sede) throw new AppError(`Sede ${body.sedeId} no encontrada`, 404);

  return repo.crear(app.prisma, {
    fecha:       new Date(body.fecha),
    semana:      body.semana,
    proveedorId: body.proveedorId,
    sedeId:      body.sedeId,
    valorPagado: body.valorPagado,
    observacion: body.observacion ?? null,
  });
}

async function obtenerLista(app, query) {
  const filtros = { skip: Number(query.skip ?? 0), take: Number(query.take ?? 50) };
  if (query.proveedorId) filtros.proveedorId = Number(query.proveedorId);
  if (query.sedeId)      filtros.sedeId      = Number(query.sedeId);
  if (query.semana)      filtros.semana      = Number(query.semana);
  if (query.fecha)       filtros.fecha       = new Date(query.fecha);
  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id) {
  const abono = await repo.buscarPorId(app.prisma, id);
  if (!abono) throw new AppError(`Abono ${id} no encontrado`, 404);
  return abono;
}

async function editar(app, id, body) {
  await obtenerPorId(app, id);
  const data = {};
  if (body.valorPagado !== undefined) data.valorPagado = body.valorPagado;
  if (body.observacion !== undefined) data.observacion = body.observacion;
  return repo.actualizar(app.prisma, id, data);
}

async function borrar(app, id) {
  await obtenerPorId(app, id);
  return repo.eliminar(app.prisma, id);
}

async function resumenPorProveedor(app, semana) {
  const filas = await repo.resumenPorProveedor(app.prisma, semana);
  const proveedores = await app.prisma.proveedor.findMany({ select: { id: true, nombre: true } });
  const mapa = Object.fromEntries(proveedores.map((p) => [p.id, p.nombre]));
  return filas.map((f) => ({
    proveedor:   mapa[f.proveedorId] ?? `Proveedor ${f.proveedorId}`,
    proveedorId: f.proveedorId,
    abonos:      f._count.id,
    totalPagado: f._sum.valorPagado,
  }));
}

async function resumenPorSede(app, semana) {
  const filas = await repo.resumenPorSede(app.prisma, semana);
  const sedes = await app.prisma.sede.findMany({ select: { id: true, nombre: true } });
  const mapa  = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));
  return filas.map((f) => ({
    sede:        mapa[f.sedeId] ?? `Sede ${f.sedeId}`,
    sedeId:      f.sedeId,
    totalPagado: f._sum.valorPagado,
  }));
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenPorProveedor, resumenPorSede };
