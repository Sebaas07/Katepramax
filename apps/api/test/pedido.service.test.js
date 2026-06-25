/**
 * Tests unitarios — pedido.service.js
 */
const { prisma } = require("./__mocks__/prisma");
const service    = require("../src/services/pedido.service");

const appMock = { prisma };

const clienteActivo = {
  id: 1, nombre: "Juan Pérez", activo: true, saldoDeuda: 0, limiteCredito: 2000000,
};
const productaActivo = {
  codigo: "CEM-001", descripcion: "Cemento Gris 50kg", activo: true, precioVenta: 25000,
};
const stockSuficiente = { sedeId: 1, productoId: "CEM-001", stockActual: 100 };
const creadorMock     = { id: 1, usuario: "admin", rol: "Admin", sedeId: 1, activo: true };

const pedidoMock = {
  id: 1, estado: "Pendiente", clienteId: 1, creadoPorId: 1,
  observaciones: null, totalRecibido: null,
  cliente:  { id: 1, nombre: "Juan Pérez" },
  creador:  { id: 1, nombreCompleto: "Admin" },
  detalles: [
    { id: 1, productoId: "CEM-001", productoNombre: "Cemento Gris 50kg",
      cantidad: 2, precioUnitario: 25000, subtotal: 50000 },
  ],
  asignaciones: [],
};

function mockCrearOk() {
  prisma.cliente.findUnique.mockResolvedValue(clienteActivo);
  prisma.usuario.findUnique.mockResolvedValue(creadorMock);
  prisma.producto.findUnique.mockResolvedValue(productaActivo);
  prisma.stockSede.findUnique.mockResolvedValue(stockSuficiente);
  prisma.$transaction.mockImplementation(async (fn) => fn({
    pedido:    { create: vi.fn().mockResolvedValue(pedidoMock) },
    stockSede: { update: vi.fn() },
    cliente:   { update: vi.fn() },
  }));
}

// ── crear ─────────────────────────────────────────────────────────────────────

describe("pedidoService.crear", () => {
  const body = { clienteId: 1, items: [{ productoId: "CEM-001", cantidad: 2 }] };

  it("debería lanzar 404 si el cliente no existe", async () => {
    prisma.cliente.findUnique.mockResolvedValue(null);

    await expect(service.crear(appMock, body, 1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería lanzar 400 si el cliente está inactivo", async () => {
    prisma.cliente.findUnique.mockResolvedValue({ ...clienteActivo, activo: false });

    await expect(service.crear(appMock, body, 1)).rejects.toMatchObject({ statusCode: 400 });
  });

  it("debería lanzar 404 si el producto no existe", async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteActivo);
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.producto.findUnique.mockResolvedValue(null);

    await expect(service.crear(appMock, body, 1)).rejects.toMatchObject({
      statusCode: 404, message: expect.stringMatching(/producto/i),
    });
  });

  it("debería lanzar 400 si el producto está inactivo", async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteActivo);
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.producto.findUnique.mockResolvedValue({ ...productaActivo, activo: false });

    await expect(service.crear(appMock, body, 1)).rejects.toMatchObject({
      statusCode: 400, message: expect.stringMatching(/inactivo/i),
    });
  });

  it("debería lanzar 400 si el stock es insuficiente", async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteActivo);
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.producto.findUnique.mockResolvedValue(productaActivo);
    prisma.stockSede.findUnique.mockResolvedValue({ ...stockSuficiente, stockActual: 1 });

    await expect(
      service.crear(appMock, { clienteId: 1, items: [{ productoId: "CEM-001", cantidad: 50 }] }, 1),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/stock/i) });
  });

  it("debería lanzar 400 si el pedido supera el límite de crédito", async () => {
    prisma.cliente.findUnique.mockResolvedValue({ ...clienteActivo, limiteCredito: 10 });
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.producto.findUnique.mockResolvedValue(productaActivo);
    prisma.stockSede.findUnique.mockResolvedValue(stockSuficiente);

    await expect(service.crear(appMock, body, 1)).rejects.toMatchObject({
      statusCode: 400, message: expect.stringMatching(/crédito/i),
    });
  });

  it("debería usar precioVenta del producto si no se pasa precioUnitario", async () => {
    mockCrearOk();

    await service.crear(appMock, body, 1);

    // La transacción recibe los detalles preparados, verificamos vía el spy
    const txFn = prisma.$transaction.mock.calls[0][0];
    const txMock = {
      pedido:    { create: vi.fn().mockResolvedValue(pedidoMock) },
      stockSede: { update: vi.fn() },
      cliente:   { update: vi.fn() },
    };
    await txFn(txMock);
    const detalles = txMock.pedido.create.mock.calls[0][0].data.detalles.create;
    expect(detalles[0].precioUnitario).toBe(25000);
    expect(detalles[0].subtotal).toBe(50000);
  });

  it("debería iniciar la transacción si todas las validaciones pasan", async () => {
    mockCrearOk();

    await service.crear(appMock, body, 1);

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("debería respetar precioUnitario si se pasa en el item", async () => {
    mockCrearOk();

    await service.crear(appMock, { clienteId: 1, items: [{ productoId: "CEM-001", cantidad: 2, precioUnitario: 20000 }] }, 1);

    const txFn = prisma.$transaction.mock.calls[0][0];
    const txMock = {
      pedido:    { create: vi.fn().mockResolvedValue(pedidoMock) },
      stockSede: { update: vi.fn() },
      cliente:   { update: vi.fn() },
    };
    await txFn(txMock);
    const detalles = txMock.pedido.create.mock.calls[0][0].data.detalles.create;
    expect(detalles[0].precioUnitario).toBe(20000);
    expect(detalles[0].subtotal).toBe(40000);
  });
});

// ── obtenerLista ──────────────────────────────────────────────────────────────

describe("pedidoService.obtenerLista", () => {
  it("debería aplicar filtro sedeId si el rol es Bodega", async () => {
    prisma.pedido.findMany.mockResolvedValue([]);

    await service.obtenerLista(appMock, {}, { rol: "Bodega", sedeId: 1 });

    const where = prisma.pedido.findMany.mock.calls[0][0].where;
    expect(where.creador).toEqual({ sedeId: 1 });
  });

  it("Admin no debería tener filtro sedeId", async () => {
    prisma.pedido.findMany.mockResolvedValue([]);

    await service.obtenerLista(appMock, {}, { rol: "Admin", sedeId: 1 });

    const where = prisma.pedido.findMany.mock.calls[0][0].where;
    expect(where.creador).toBeUndefined();
  });

  it("debería convertir clienteId a número", async () => {
    prisma.pedido.findMany.mockResolvedValue([]);

    await service.obtenerLista(appMock, { clienteId: "5" }, { rol: "Admin" });

    const where = prisma.pedido.findMany.mock.calls[0][0].where;
    expect(where.clienteId).toBe(5);
  });
});

// ── obtenerPorId ──────────────────────────────────────────────────────────────

describe("pedidoService.obtenerPorId", () => {
  it("debería retornar el pedido si existe", async () => {
    prisma.pedido.findUnique.mockResolvedValue(pedidoMock);

    const result = await service.obtenerPorId(appMock, 1, creadorMock);

    expect(result.id).toBe(1);
  });

  it("debería lanzar 404 si no existe", async () => {
    prisma.pedido.findUnique.mockResolvedValue(null);

    await expect(service.obtenerPorId(appMock, 999, creadorMock)).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── cambiarEstado ─────────────────────────────────────────────────────────────

describe("pedidoService.cambiarEstado", () => {
  it("debería lanzar 404 si el pedido no existe", async () => {
    prisma.pedido.findUnique.mockResolvedValue(null);

    await expect(service.cambiarEstado(appMock, 999, "Cancelado", creadorMock)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("debería lanzar 400 para transición inválida (Entregado→Cancelado)", async () => {
    prisma.pedido.findUnique.mockResolvedValue({ ...pedidoMock, estado: "Entregado" });

    await expect(service.cambiarEstado(appMock, 1, "Cancelado", creadorMock)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("debería lanzar 400 para transición inválida (Cancelado→Pendiente)", async () => {
    prisma.pedido.findUnique.mockResolvedValue({ ...pedidoMock, estado: "Cancelado" });

    await expect(service.cambiarEstado(appMock, 1, "Pendiente", creadorMock)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("debería ejecutar transacción al cancelar: devuelve stock y reduce deuda", async () => {
    prisma.pedido.findUnique
      .mockResolvedValueOnce(pedidoMock)   // obtenerPorId
      .mockResolvedValueOnce(pedidoMock);  // buscarPorId final
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);

    const txStock  = vi.fn();
    const txCliente = vi.fn();
    const txPedido = vi.fn();

    prisma.$transaction.mockImplementation(async (fn) => {
      await fn({ stockSede: { update: txStock }, cliente: { update: txCliente }, pedido: { update: txPedido }, historialEstadoPedido: { create: vi.fn() } });
    });

    await service.cambiarEstado(appMock, 1, "Cancelado", creadorMock);

    expect(prisma.$transaction).toHaveBeenCalled();
    // stock se devuelve (increment)
    expect(txStock).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stockActual: { increment: 2 } } }),
    );
    // deuda se reduce (decrement del subtotal)
    expect(txCliente).toHaveBeenCalledWith(
      expect.objectContaining({ data: { saldoDeuda: { decrement: 50000 } } }),
    );
  });

  it("debería actualizar estado directamente si es Asignado→Cancelado", async () => {
    const pedidoAsignado = { ...pedidoMock, estado: "Asignado" };
    prisma.pedido.findUnique
      .mockResolvedValueOnce(pedidoAsignado)
      .mockResolvedValueOnce(pedidoAsignado);
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.$transaction.mockImplementation(async (fn) => {
      await fn({ stockSede: { update: vi.fn() }, cliente: { update: vi.fn() }, pedido: { update: vi.fn() }, historialEstadoPedido: { create: vi.fn() } });
    });

    await service.cambiarEstado(appMock, 1, "Cancelado", creadorMock);

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});