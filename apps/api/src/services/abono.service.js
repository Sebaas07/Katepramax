const repo     = require("../repositories/abono.repository");
const AppError = require("../errors/AppError");
const { fechaValida, numeroPositivo, rangoDia, sanitizarTexto, semanaValida, sedeEsPermitida, sedeDeuda } = require("../utils/contabilidad");
const { registrarAccion } = require("../utils/logger");

async function registrar(app, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para registrar abonos.", 403);
  }

  const proveedor = await app.prisma.proveedor.findUnique({ where: { id: body.proveedorId } });
  if (!proveedor) throw new AppError(`Proveedor ${body.proveedorId} no encontrado`, 404);
  if (!proveedor.activo) throw new AppError(`Proveedor "${proveedor.nombre}" está inactivo`, 422);

  // La deuda se registra en la bodega, así que el abono se aplica sobre la
  // bodega que alimenta al usuario (sus oficinas comparten la deuda).
  let sedeId = Number(body.sedeId);
  if (usuario.rol !== "Admin") {
    sedeId = await sedeDeuda(app, usuario);
  }

  const sede = await app.prisma.sede.findUnique({ where: { id: sedeId } });
  if (!sede) throw new AppError(`Sede ${sedeId} no encontrada`, 404);

  const nuevo = await repo.crear(app.prisma, {
    fecha: fechaValida(body.fecha),
    semana: semanaValida(body.semana),
    proveedorId: body.proveedorId,
    sedeId,
    valorPagado: numeroPositivo(body.valorPagado, "valor de abono"),
    observacion: body.observacion === undefined ? null : sanitizarTexto(body.observacion) || null,
    comprobante: body.comprobante === undefined ? null : sanitizarTexto(body.comprobante, 50) || null,
  });

  await registrarAccion(
    app,
    usuario.id,
    "CREAR_ABONO",
    `Registró un abono de ${nuevo.valorPagado} a "${proveedor.nombre}" (sede ${sedeId}).`,
  );

  return nuevo;
}

async function obtenerLista(app, query, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para listar abonos.", 403);
  }

  const filtros = { skip: Number(query.skip ?? 0), take: Number(query.take ?? 50) };
  if (query.proveedorId) filtros.proveedorId = Number(query.proveedorId);
  if (query.semana)      filtros.semana      = semanaValida(query.semana);
  if (query.fecha)       filtros.fecha       = rangoDia(query.fecha);

  if (usuario.rol !== "Admin") {
    filtros.sedeId = await sedeDeuda(app, usuario);
  } else if (query.sedeId) {
    filtros.sedeId = Number(query.sedeId);
  }

  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para ver abonos.", 403);
  }

  const abono = await repo.buscarPorId(app.prisma, id);
  if (!abono) throw new AppError(`Abono ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin") {
    const permitidas = new Set([usuario.sedeId, await sedeDeuda(app, usuario)]);
    if (!permitidas.has(abono.sedeId)) {
      throw new AppError("No tienes permiso para ver este abono.", 403);
    }
  }

  return abono;
}

async function editar(app, id, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para editar abonos.", 403);
  }

  await obtenerPorId(app, id, usuario);
  const data = {};
  if (body.valorPagado !== undefined) data.valorPagado = numeroPositivo(body.valorPagado, "valor de abono");
  if (body.observacion !== undefined) data.observacion = sanitizarTexto(body.observacion);
  if (body.comprobante !== undefined) data.comprobante = body.comprobante === null ? null : sanitizarTexto(body.comprobante, 50);
  const actualizado = await repo.actualizar(app.prisma, id, data);
  await registrarAccion(
    app,
    usuario.id,
    "EDITAR_ABONO",
    `Editó el abono #${id}.`,
  );
  return actualizado;
}

async function borrar(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para eliminar abonos.", 403);
  }

  await obtenerPorId(app, id, usuario);
  const resultado = await repo.eliminar(app.prisma, id);
  await registrarAccion(
    app,
    usuario.id,
    "ELIMINAR_ABONO",
    `Eliminó el abono #${id}.`,
  );
  return resultado;
}

async function resumenPorProveedor(app, semana, usuario) {
  const sedeId = await sedeDeuda(app, usuario);
  const filas = await repo.resumenPorProveedor(app.prisma, semanaValida(semana), sedeId);
  const proveedores = await app.prisma.proveedor.findMany({ select: { id: true, nombre: true } });
  const mapa = Object.fromEntries(proveedores.map((p) => [p.id, p.nombre]));
  return filas.map((f) => ({
    proveedor:   mapa[f.proveedorId] ?? `Proveedor ${f.proveedorId}`,
    proveedorId: f.proveedorId,
    abonos:      f._count.id,
    totalPagado: Number(f._sum.valorPagado),
  }));
}

async function resumenPorSede(app, semana, usuario) {
  const sedeId = await sedeDeuda(app, usuario);
  const filas = await repo.resumenPorSede(app.prisma, semanaValida(semana), sedeId);
  const sedes = usuario.rol !== "Admin" && sedeId != null
    ? [{ id: sedeId, nombre: (await app.prisma.sede.findUnique({ where: { id: sedeId }, select: { nombre: true } }))?.nombre ?? `Sede ${sedeId}` }]
    : await app.prisma.sede.findMany({ select: { id: true, nombre: true } });
  const mapa  = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));
  return filas.map((f) => ({
    sede:        mapa[f.sedeId] ?? `Sede ${f.sedeId}`,
    sedeId:      f.sedeId,
    totalPagado: Number(f._sum.valorPagado),
  }));
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenPorProveedor, resumenPorSede };
