const repo = require("../repositories/pedido.repository");
const AppError = require("../errors/AppError");
const { registrarAccion } = require("../utils/logger");

/**
 * pedido.service.js
 * Lógica de negocio del módulo Pedido.
 *
 * Reglas de sede por rol:
 * - Admin: acceso total, puede crear en cualquier sede.
 * - AdminBogota / Oficinista: acceso restringido a su propia sede.
 * - Bodega: solo lectura (vista de entregas).
 *
 * Al crear un pedido:
 *  1. Valida cliente, productos y stock disponible.
 *  2. Crea el pedido con sus detalles en una transacción.
 *  3. Descuenta el stock en StockSede.
 *  4. Incrementa el saldoDeuda del cliente.
 */

// Puede crear y gestionar pedidos: Admin, AdminBogota, Oficinista
function sedeEsPermitidaGestion(usuario) {
  return (
    usuario.rol === "Admin" ||
    usuario.rol === "AdminBogota" ||
    usuario.rol === "Oficinista"
  );
}

// Puede leer pedidos (incluye Bodega solo lectura): + Bodega
function sedeEsPermitidaLectura(usuario) {
  return (
    sedeEsPermitidaGestion(usuario) ||
    usuario.rol === "Bodega"
  );
}

/**
 * Sedes "operativas" de un usuario para consultar pedidos:
 * - Admin: null (ve todo).
 * - Bodega: su propia sede + las oficinas que le pertenecen (bodegaId).
 * - Oficinista (Oficina): su sede y, si la oficina tiene bodega asignada,
 *   también la bodega (para ver los pedidos que debe despachar su oficina).
 * - AdminBogota: su sede.
 * El set se resuelve en el auth middleware (`usuario.sedesOperativas`).
 */
function sedesOperativas(usuario) {
  if (usuario?.rol === "Admin") return null;
  if (Array.isArray(usuario?.sedesOperativas) && usuario.sedesOperativas.length > 0) {
    return usuario.sedesOperativas;
  }
  return [usuario?.sedeId];
}

/**
 * Sede donde se valida/descuenta el stock de un pedido.
 * Las oficinas se alimentan de una bodega (sede.bodegaId) y no manejan stock
 * propio: si la sede del pedido es una oficina con bodega asignada, el stock
 * se toma de esa bodega. El pedido conserva su sedeId (la oficina).
 */
async function resolverSedeStock(app, sedeId) {
  const sede = await app.prisma.sede.findUnique({
    where: { id: sedeId },
    select: { id: true, tipo: true, bodegaId: true },
  });
  if (sede?.tipo === "Oficina" && sede.bodegaId != null) return sede.bodegaId;
  return sedeId;
}

async function crear(app, body, usuarioId) {
  const {
    clienteId,
    items,
    direccion,
    observaciones,
    valorDomicilio,
    sedeId: sedeIdBody,
  } = body;

  if (!clienteId) throw new AppError("Se requiere clienteId", 400);
  if (!items || items.length === 0)
    throw new AppError("El pedido debe tener al menos un producto.", 400);

  const valorDomicilioNum = Number(valorDomicilio ?? 0);
  if (Number.isNaN(valorDomicilioNum) || valorDomicilioNum < 0) {
    throw new AppError("valorDomicilio debe ser un número mayor o igual a 0.", 400);
  }

  const cliente = await app.prisma.cliente.findUnique({
    where: { id: clienteId },
  });
  if (!cliente) throw new AppError(`Cliente ${clienteId} no encontrado`, 404);
  if (!cliente.activo)
    throw new AppError(`El cliente ${cliente.nombre} está inactivo`, 400);

  const creador = await app.prisma.usuario.findUnique({
    where: { id: usuarioId },
  });
  if (!creador) throw new AppError("Usuario no encontrado", 404);
  if (!sedeEsPermitidaGestion(creador)) {
    throw new AppError("Rol no autorizado para crear pedidos.", 403);
  }

  let sedePedido = creador.sedeId;

  if (creador.rol === "Admin") {
    if (sedeIdBody == null || sedeIdBody === "") {
      sedePedido = creador.sedeId;
    } else {
      sedePedido = Number(sedeIdBody);
    }
  }

  // El stock de un pedido en una oficina se descuenta de la bodega que la
  // alimenta (la oficina no tiene stock propio).
  const sedeStock = await resolverSedeStock(app, sedePedido);

  const detallesPreparados = [];
  let totalPedido = 0;

  for (const item of items) {
    const codigoProd = Number(item.productoId);
    const cantidadReq = Number(item.cantidad);

    const producto = await app.prisma.producto.findUnique({
      where: { codigo: codigoProd },
    });
    if (!producto)
      throw new AppError(`Producto ${item.productoId} no encontrado`, 404);
    if (!producto.activo)
      throw new AppError(
        `El producto ${producto.descripcion} está inactivo`,
        400,
      );

    const stock = await app.prisma.stockSede.findUnique({
      where: {
        sedeId_productoId: { sedeId: sedeStock, productoId: codigoProd },
      },
    });
    const stockDisponible = stock?.stockActual ?? 0;
    if (stockDisponible < cantidadReq) {
      throw new AppError(
        `Stock insuficiente para ${producto.descripcion}. Disponible: ${stockDisponible}, solicitado: ${cantidadReq}`,
        400,
      );
    }

    const precioUnitario = item.precioUnitario ?? producto.precioVenta;
    const subtotal = Number(precioUnitario) * cantidadReq;
    totalPedido += subtotal;

    detallesPreparados.push({
      productoId: codigoProd,
      productoNombre: producto.descripcion,
      cantidad: cantidadReq,
      precioUnitario,
      subtotal,
    });
  }

  const deudaProyectada = Number(cliente.saldoDeuda) + totalPedido;
  if (deudaProyectada > Number(cliente.limiteCredito)) {
    throw new AppError(
      `El pedido supera el límite de crédito del cliente. Límite: ${cliente.limiteCredito}, deuda actual: ${cliente.saldoDeuda}, pedido: ${totalPedido}`,
      400,
    );
  }

  const pedido = await app.prisma.$transaction(async (tx) => {
    const nuevoPedido = await tx.pedido.create({
      data: {
        clienteId,
        creadoPorId: usuarioId,
        sedeId: sedePedido,
        direccion,
        observaciones,
        valorDomicilio: valorDomicilioNum,
        detalles: { create: detallesPreparados },
      },
      include: {
        cliente: { select: { id: true, nombre: true } },
        creador: { select: { id: true, nombreCompleto: true } },
        sede: { select: { id: true, nombre: true } },
        detalles: true,
      },
    });

    for (const item of items) {
      const codigoProd = Number(item.productoId);
      const cantidadReq = Number(item.cantidad);
      await tx.stockSede.update({
        where: {
          sedeId_productoId: {
            sedeId: sedeStock,
            productoId: codigoProd,
          },
        },
        data: { stockActual: { decrement: cantidadReq } },
      });
    }

    await tx.cliente.update({
      where: { id: clienteId },
      data: { saldoDeuda: { increment: totalPedido } },
    });

    return nuevoPedido;
  });

  await registrarAccion(
    app,
    usuarioId,
    "CREAR_PEDIDO",
    `Creó el pedido #${pedido.id} para el cliente "${cliente.nombre}".`,
  );

  return pedido;
}

async function obtenerLista(app, query, usuario) {
  if (!sedeEsPermitidaLectura(usuario)) {
    throw new AppError("No tienes permiso para listar pedidos.", 403);
  }

  const filtros = {
    skip: Number(query.skip ?? 0),
    take: Number(query.take ?? 50),
  };
  if (query.clienteId) filtros.clienteId = Number(query.clienteId);
  if (query.estado) filtros.estado = query.estado;
  if (query.creadoPorId) filtros.creadoPorId = Number(query.creadoPorId);

  const sedes = sedesOperativas(usuario);
  if (sedes) {
    if (sedes.length === 1) {
      filtros.sedeId = sedes[0];
    } else {
      filtros.sedeIds = sedes;
    }
  } else if (query.sedeId) {
    filtros.sedeId = Number(query.sedeId);
  }

  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id, usuario) {
  if (!sedeEsPermitidaLectura(usuario)) {
    throw new AppError("No tienes permiso para ver este pedido.", 403);
  }

  const pedido = await repo.buscarPorId(app.prisma, id);
  if (!pedido) throw new AppError(`Pedido ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin") {
    const sedes = sedesOperativas(usuario);
    const sedePedido = pedido.sedeId ?? pedido.creador?.sedeId;
    if (sedePedido != null && !sedes.includes(sedePedido)) {
      throw new AppError("No tienes permiso para ver este pedido.", 403);
    }
  }

  return pedido;
}

async function cambiarEstado(app, id, nuevoEstado, usuario) {
  if (!sedeEsPermitidaGestion(usuario)) {
    throw new AppError(
      "No tienes permiso para cambiar el estado del pedido.",
      403,
    );
  }

  const pedido = await repo.buscarPorId(app.prisma, id);
  if (!pedido) throw new AppError(`Pedido ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin") {
    const sedes = sedesOperativas(usuario);
    const sedePedido = pedido.sedeId ?? pedido.creador?.sedeId;
    if (sedePedido != null && !sedes.includes(sedePedido)) {
      throw new AppError(
        "No tienes permiso para cambiar el estado de este pedido.",
        403,
      );
    }
  }

  const transicionesValidas = {
    Pendiente: ["Asignado", "Cancelado"],
    Asignado: ["Cancelado", "Pendiente"],
    Entregado: [],
    Cancelado: [],
  };

  if (!transicionesValidas[pedido.estado]?.includes(nuevoEstado)) {
    throw new AppError(
      `No se puede cambiar el estado de ${pedido.estado} a ${nuevoEstado}`,
      400,
    );
  }

  const estadoAnterior = pedido.estado;

  if (nuevoEstado === "Cancelado") {
    const creador = await app.prisma.usuario.findUnique({
      where: { id: pedido.creadoPorId },
    });
    const totalPedido = pedido.detalles.reduce(
      (sum, d) => sum + Number(d.subtotal),
      0,
    );
    // El stock se descontó de la bodega que alimenta la oficina del creador;
    // la cancelación lo devuelve a la misma bodega.
    const sedeStock = await resolverSedeStock(app, creador.sedeId);

    await app.prisma.$transaction(async (tx) => {
      for (const detalle of pedido.detalles) {
        await tx.stockSede.update({
          where: {
            sedeId_productoId: {
              sedeId: sedeStock,
              productoId: detalle.productoId,
            },
          },
          data: { stockActual: { increment: detalle.cantidad } },
        });
      }
      await tx.cliente.update({
        where: { id: pedido.clienteId },
        data: { saldoDeuda: { decrement: totalPedido } },
      });
      await tx.pedido.update({ where: { id }, data: { estado: nuevoEstado } });
      await tx.historialEstadoPedido.create({
        data: {
          pedidoId: id,
          estado: nuevoEstado,
          usuarioId: usuario.id,
        },
      });
    });

    await registrarAccion(
      app,
      usuario.id,
      "CANCELAR_PEDIDO",
      `Canceló el pedido #${id}.`,
    );

    return repo.buscarPorId(app.prisma, id);
  }

  const resultado = await app.prisma.$transaction(async (tx) => {
    await tx.pedido.update({ where: { id }, data: { estado: nuevoEstado } });
    await tx.historialEstadoPedido.create({
      data: {
        pedidoId: id,
        estado: nuevoEstado,
        usuarioId: usuario.id,
      },
    });
    return repo.buscarPorId(app.prisma, id);
  });

  await registrarAccion(
    app,
    usuario.id,
    "CAMBIAR_ESTADO_PEDIDO",
    `Cambió el pedido #${id} de "${estadoAnterior}" a "${nuevoEstado}".`,
  );

  return resultado;
}

async function obtenerHistorial(app, id, usuario) {
  const pedido = await repo.buscarPorId(app.prisma, id);
  if (!pedido) throw new AppError(`Pedido ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin") {
    const sedes = sedesOperativas(usuario);
    const sedePedido = pedido.sedeId ?? pedido.creador?.sedeId;
    if (sedePedido != null && !sedes.includes(sedePedido)) {
      throw new AppError("No tienes permiso para ver este historial.", 403);
    }
  }

  return await app.prisma.historialEstadoPedido.findMany({
    where: { pedidoId: id },
    orderBy: { cambiadoEn: "desc" },
    include: {
      usuario: { select: { id: true, nombreCompleto: true, rol: true } },
    },
  });
}

/**
 * Cuenta los pedidos en estado "Pendiente" (sin entregador asignado).
 * Es la "notificación" que ve la Bodega cuando una oficina crea un pedido
 * y está por asignar el entregador. Filtra por sede según el rol.
 */
async function contarPendientes(app, usuario) {
  if (!sedeEsPermitidaLectura(usuario)) {
    throw new AppError("No tienes permiso para consultar pedidos pendientes.", 403);
  }

  const where = { estado: "Pendiente" };
  const sedes = sedesOperativas(usuario);
  if (sedes) {
    where.creador = { sedeId: { in: sedes } };
  }

  const total = await app.prisma.pedido.count({ where });
  return { pendientes: total };
}

/**
 * Datos de la factura de un pedido, para generar el ticket imprimible con QR.
 * Es un endpoint PÚBLICO (sin sesión) porque el QR impreso en el ticket lo
 * escanea cualquier persona para validar el documento. Por eso solo se
 * exponen los campos de un comprobante, nada de stock ni datos sensibles.
 */
async function obtenerFactura(app, id) {
  const pedido = await repo.buscarPorId(app.prisma, id);
  if (!pedido) throw new AppError(`Pedido ${id} no encontrado`, 404);

  const total = pedido.detalles.reduce((sum, d) => sum + Number(d.subtotal), 0);
  const entrega = pedido.asignaciones?.[0] ?? null;

  return {
    id: pedido.id,
    estado: pedido.estado,
    fecha: pedido.creadoEn,
    direccion: pedido.direccion,
    emisor: pedido.sede?.nombre ?? "Katepramax",
    cliente: pedido.cliente?.nombre ?? `Cliente #${pedido.clienteId}`,
    telefonoCliente: pedido.cliente?.telefono ?? null,
    creador: pedido.creador?.nombreCompleto ?? null,
    detalles: pedido.detalles.map((d) => ({
      nombre: d.productoNombre,
      cantidad: d.cantidad,
      precioUnitario: Number(d.precioUnitario),
      subtotal: Number(d.subtotal),
    })),
    total,
    totalRecibido:
      pedido.totalRecibido != null ? Number(pedido.totalRecibido) : null,
    valorDomicilio: pedido.valorDomicilio != null ? Number(pedido.valorDomicilio) : 0,
    metodoPago: entrega?.metodoPago ?? null,
    fechaConfirmada: entrega?.fechaConfirmada ?? null,
  };
}

module.exports = {
  crear,
  obtenerLista,
  obtenerPorId,
  cambiarEstado,
  obtenerHistorial,
  obtenerFactura,
  contarPendientes,
};
