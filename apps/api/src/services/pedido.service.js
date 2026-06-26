const repo = require("../repositories/pedido.repository");
const AppError = require("../errors/AppError");

/**
 * pedido.service.js
 * Lógica de negocio del módulo Pedido.
 *
 * Reglas de sede por rol:
 * - Admin: acceso total, puede crear en cualquier sede.
 * - Bodega / AdminBogota: acceso restringido a su propia sede.
 *
 * Al crear un pedido:
 *  1. Valida cliente, productos y stock disponible.
 *  2. Crea el pedido con sus detalles en una transacción.
 *  3. Descuenta el stock en StockSede.
 *  4. Incrementa el saldoDeuda del cliente.
 */

function sedeEsPermitida(usuario) {
  return (
    usuario.rol === "Admin" ||
    usuario.rol === "Bodega" ||
    usuario.rol === "AdminBogota"
  );
}

async function crear(app, body, usuarioId) {
  const { clienteId, items, observaciones, sedeId: sedeIdBody } = body;

  if (!clienteId) throw new AppError("Se requiere clienteId", 400);
  if (!items || items.length === 0)
    throw new AppError("El pedido debe tener al menos un producto.", 400);

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
  if (!sedeEsPermitida(creador)) {
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
        sedeId_productoId: { sedeId: sedePedido, productoId: codigoProd },
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
        observaciones,
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
            sedeId: sedePedido,
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

  return pedido;
}

async function obtenerLista(app, query, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para listar pedidos.", 403);
  }

  const filtros = {
    skip: Number(query.skip ?? 0),
    take: Number(query.take ?? 50),
  };
  if (query.clienteId) filtros.clienteId = Number(query.clienteId);
  if (query.estado) filtros.estado = query.estado;
  if (query.creadoPorId) filtros.creadoPorId = Number(query.creadoPorId);

  if (usuario.rol !== "Admin") {
    filtros.sedeId = usuario.sedeId;
  }

  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para ver este pedido.", 403);
  }

  const pedido = await repo.buscarPorId(app.prisma, id);
  if (!pedido) throw new AppError(`Pedido ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin") {
    const sedePedido = pedido.sedeId ?? pedido.creador?.sedeId;
    if (sedePedido != null && sedePedido !== usuario.sedeId) {
      throw new AppError("No tienes permiso para ver este pedido.", 403);
    }
  }

  return pedido;
}

async function cambiarEstado(app, id, nuevoEstado, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError(
      "No tienes permiso para cambiar el estado del pedido.",
      403,
    );
  }

  const pedido = await repo.buscarPorId(app.prisma, id);
  if (!pedido) throw new AppError(`Pedido ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin") {
    const sedePedido = pedido.sedeId ?? pedido.creador?.sedeId;
    if (sedePedido != null && sedePedido !== usuario.sedeId) {
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

    await app.prisma.$transaction(async (tx) => {
      for (const detalle of pedido.detalles) {
        await tx.stockSede.update({
          where: {
            sedeId_productoId: {
              sedeId: creador.sedeId,
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

    return repo.buscarPorId(app.prisma, id);
  }

  return app.prisma.$transaction(async (tx) => {
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
}

async function obtenerHistorial(app, id, usuario) {
  const pedido = await repo.buscarPorId(app.prisma, id);
  if (!pedido) throw new AppError(`Pedido ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin") {
    const sedePedido = pedido.sedeId ?? pedido.creador?.sedeId;
    if (sedePedido != null && sedePedido !== usuario.sedeId) {
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

module.exports = {
  crear,
  obtenerLista,
  obtenerPorId,
  cambiarEstado,
  obtenerHistorial,
};
