const repo     = require("../repositories/abono.repository");
const egresoRepo = require("../repositories/egreso.repository");
const AppError = require("../errors/AppError");
const { fechaValida, numeroPositivo, rangoDia, sanitizarTexto, semanaValida, sedeEsPermitida, sedeWhere, ORIGENES } = require("../utils/contabilidad");
const { registrarAccion } = require("../utils/logger");

async function registrar(app, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para registrar abonos.", 403);
  }

  const proveedor = await app.prisma.proveedor.findUnique({ where: { id: body.proveedorId } });
  if (!proveedor) throw new AppError(`Proveedor ${body.proveedorId} no encontrado`, 404);
  if (!proveedor.activo) throw new AppError(`Proveedor "${proveedor.nombre}" está inactivo`, 422);

  let sedeId = Number(body.sedeId);
  if (usuario.rol !== "Admin" && sedeId !== usuario.sedeId) {
    throw new AppError("No puedes registrar abonos en otra sede.", 403);
  }

  const sede = await app.prisma.sede.findUnique({ where: { id: sedeId } });
  if (!sede) throw new AppError(`Sede ${sedeId} no encontrada`, 404);

  // El pago a un proveedor es una salida real de caja: se registra el abono
  // (detalle operativo) y el Egreso correspondiente en la misma transacción
  // para que Contabilidad siempre refleje el pago.
  const resultado = await app.prisma.$transaction(async (tx) => {
    const nuevo = await repo.crear(tx, {
      fecha: fechaValida(body.fecha),
      semana: semanaValida(body.semana),
      proveedorId: body.proveedorId,
      sedeId,
      valorPagado: numeroPositivo(body.valorPagado, "valor de abono"),
      observacion: body.observacion === undefined ? null : sanitizarTexto(body.observacion) || null,
      comprobante: body.comprobante === undefined ? null : sanitizarTexto(body.comprobante, 50) || null,
    });

    const egreso = await egresoRepo.crear(tx, {
      fecha: fechaValida(body.fecha),
      semana: semanaValida(body.semana),
      sedeId,
      concepto: `Abono a proveedor "${proveedor.nombre}"`,
      total: numeroPositivo(body.valorPagado, "valor de abono"),
      observacion: body.observacion === undefined ? `Abono a ${proveedor.nombre}` : sanitizarTexto(body.observacion) || `Abono a ${proveedor.nombre}`,
      origen: ORIGENES.ABONO_PROVEEDOR,
      idReferencia: nuevo.id,
    });

    return { nuevo, egreso };
  });

  await registrarAccion(
    app,
    usuario.id,
    "CREAR_ABONO",
    `Registró un abono de ${resultado.nuevo.valorPagado} a "${proveedor.nombre}" (sede ${sedeId}).`,
  );

  return resultado.nuevo;
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
    filtros.sedeId = usuario.sedeId;
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

  if (usuario.rol !== "Admin" && abono.sedeId !== usuario.sedeId) {
    throw new AppError("No tienes permiso para ver este abono.", 403);
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

  // Mantiene sincronizado el Egreso automático (origen abono-proveedor).
  const actualizado = await app.prisma.$transaction(async (tx) => {
    const abono = await repo.actualizar(tx, id, data);
    const egreso = await tx.egreso.findFirst({
      where: { origen: ORIGENES.ABONO_PROVEEDOR, idReferencia: id },
    });
    if (egreso) {
      await tx.egreso.update({
        where: { id: egreso.id },
        data: {
          ...(data.valorPagado !== undefined && { total: data.valorPagado }),
          ...(data.observacion !== undefined && { observacion: data.observacion || null }),
        },
      });
    }
    return abono;
  });

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

  // Elimina también el Egreso automático asociado para no dejar un egreso
  // huérfano en Contabilidad.
  await app.prisma.$transaction(async (tx) => {
    await tx.egreso.deleteMany({
      where: { origen: ORIGENES.ABONO_PROVEEDOR, idReferencia: id },
    });
    await repo.eliminar(tx, id);
  });

  await registrarAccion(
    app,
    usuario.id,
    "ELIMINAR_ABONO",
    `Eliminó el abono #${id}.`,
  );
  return { mensaje: "Abono eliminado correctamente" };
}

async function resumenPorProveedor(app, semana, usuario) {
  const where = sedeWhere(usuario);
  const filas = await repo.resumenPorProveedor(app.prisma, semanaValida(semana), where.sedeId);
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
  const where = sedeWhere(usuario);
  const filas = await repo.resumenPorSede(app.prisma, semanaValida(semana), where.sedeId);
  const sedes = usuario.rol !== "Admin" && usuario.sedeId != null
    ? [{ id: usuario.sedeId, nombre: `Sede ${usuario.sedeId}` }]
    : await app.prisma.sede.findMany({ select: { id: true, nombre: true } });
  const mapa  = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));
  return filas.map((f) => ({
    sede:        mapa[f.sedeId] ?? `Sede ${f.sedeId}`,
    sedeId:      f.sedeId,
    totalPagado: Number(f._sum.valorPagado),
  }));
}

module.exports = { registrar, obtenerLista, obtenerPorId, editar, borrar, resumenPorProveedor, resumenPorSede };
