const repo     = require("../repositories/pedido.repository");
const AppError = require("../errors/AppError");

/**
 * pedido.service.js
 * Lógica de negocio del módulo Pedido.
 *
 * Al crear un pedido:
 *  1. Valida cliente, productos y stock disponible.
 *  2. Crea el pedido con sus detalles en una transacción.
 *  3. Descuenta el stock en StockSede.
 *  4. Incrementa el saldoDeuda del cliente.
 */

async function crear(app, body, usuarioId) {
  const { clienteId, items, observaciones } = body;

  // ── Validaciones previas ──────────────────────────────────────────────────
  const cliente = await app.prisma.cliente.findUnique({ where: { id: clienteId } });
  if (!cliente) throw new AppError(`Cliente ${clienteId} no encontrado`, 404);
  if (!cliente.activo) throw new AppError(`El cliente ${cliente.nombre} está inactivo`, 400);

  // Obtener sede del usuario que crea el pedido (para validar stock)
  const creador = await app.prisma.usuario.findUnique({ where: { id: usuarioId } });

  // Cargar productos y verificar existencia + stock
  const detallesPreparados = [];
  let totalPedido = 0;

  for (const item of items) {
    const producto = await app.prisma.producto.findUnique({ where: { codigo: item.productoId } });
    if (!producto) throw new AppError(`Producto ${item.productoId} no encontrado`, 404);
    if (!producto.activo) throw new AppError(`El producto ${producto.descripcion} está inactivo`, 400);

    // Verificar stock en la sede del creador
    const stock = await app.prisma.stockSede.findUnique({
      where: { sedeId_productoId: { sedeId: creador.sedeId, productoId: item.productoId } },
    });
    const stockDisponible = stock?.stockActual ?? 0;
    if (stockDisponible < item.cantidad) {
      throw new AppError(
        `Stock insuficiente para ${producto.descripcion}. Disponible: ${stockDisponible}, solicitado: ${item.cantidad}`,
        400,
      );
    }

    const precioUnitario = item.precioUnitario ?? producto.precioVenta;
    const subtotal = Number(precioUnitario) * item.cantidad;
    totalPedido += subtotal;

    detallesPreparados.push({
      productoId:     item.productoId,
      productoNombre: producto.descripcion,
      cantidad:       item.cantidad,
      precioUnitario,
      subtotal,
    });
  }

  // Validar límite de crédito
  const deudaProyectada = Number(cliente.saldoDeuda) + totalPedido;
  if (deudaProyectada > Number(cliente.limiteCredito)) {
    throw new AppError(
      `El pedido supera el límite de crédito del cliente. Límite: ${cliente.limiteCredito}, deuda actual: ${cliente.saldoDeuda}, pedido: ${totalPedido}`,
      400,
    );
  }

  // ── Transacción ───────────────────────────────────────────────────────────
  const pedido = await app.prisma.$transaction(async (tx) => {
    // 1. Crear pedido con detalles
    const nuevoPedido = await tx.pedido.create({
      data: {
        clienteId,
        creadoPorId: usuarioId,
        observaciones,
        detalles: { create: detallesPreparados },
      },
      include: {
        cliente: { select: { id: true, nombre: true } },
        creador: { select: { id: true, nombreCompleto: true } },
        detalles: true,
      },
    });

    // 2. Descontar stock en StockSede
    for (const item of items) {
      await tx.stockSede.update({
        where: { sedeId_productoId: { sedeId: creador.sedeId, productoId: item.productoId } },
        data:  { stockActual: { decrement: item.cantidad } },
      });
    }

    // 3. Incrementar saldo de deuda del cliente
    await tx.cliente.update({
      where: { id: clienteId },
      data:  { saldoDeuda: { increment: totalPedido } },
    });

    return nuevoPedido;
  });

  return pedido;
}

async function obtenerLista(app, query, usuario) {
  const filtros = {
    skip: Number(query.skip ?? 0),
    take: Number(query.take ?? 50),
  };
  if (query.clienteId)   filtros.clienteId   = Number(query.clienteId);
  if (query.estado)      filtros.estado      = query.estado;
  if (query.creadoPorId) filtros.creadoPorId = Number(query.creadoPorId);

  // Bodega solo ve los pedidos de su propia sede; Admin los ve todos
  if (usuario.rol === "Bodega") filtros.sedeId = usuario.sedeId;

  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id) {
  const pedido = await repo.buscarPorId(app.prisma, id);
  if (!pedido) throw new AppError(`Pedido ${id} no encontrado`, 404);
  return pedido;
}

async function cambiarEstado(app, id, nuevoEstado) {
  const pedido = await obtenerPorId(app, id);

  // Reglas de transición de estado
  // "Asignado" y "Entregado" NO se permiten aquí: los maneja el módulo de asignaciones
  const transicionesValidas = {
    Pendiente: ["Cancelado"],
    Asignado:  ["Cancelado"],
    Entregado: [],
    Cancelado: [],
  };

  if (!transicionesValidas[pedido.estado]?.includes(nuevoEstado)) {
    throw new AppError(
      `No se puede cambiar el estado de ${pedido.estado} a ${nuevoEstado}`,
      400,
    );
  }

  // Si se cancela, devolver stock y reducir deuda
  if (nuevoEstado === "Cancelado") {
    const creador = await app.prisma.usuario.findUnique({ where: { id: pedido.creadoPorId } });
    const totalPedido = pedido.detalles.reduce((sum, d) => sum + Number(d.subtotal), 0);

    await app.prisma.$transaction(async (tx) => {
      // Devolver stock
      for (const detalle of pedido.detalles) {
        await tx.stockSede.update({
          where: { sedeId_productoId: { sedeId: creador.sedeId, productoId: detalle.productoId } },
          data:  { stockActual: { increment: detalle.cantidad } },
        });
      }
      // Reducir deuda del cliente
      await tx.cliente.update({
        where: { id: pedido.clienteId },
        data:  { saldoDeuda: { decrement: totalPedido } },
      });
      // Actualizar estado
      await tx.pedido.update({ where: { id }, data: { estado: nuevoEstado } });
    });

    return repo.buscarPorId(app.prisma, id);
  }

  return repo.actualizar(app.prisma, id, { estado: nuevoEstado });
}

module.exports = { crear, obtenerLista, obtenerPorId, cambiarEstado };
