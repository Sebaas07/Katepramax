/**
 * Tests de integración — rutas HTTP de Pedido
 */
const { buildApp } = require("../src/app");
const { prisma }   = require("./__mocks__/prisma");

// ── Datos de prueba ───────────────────────────────────────────────────────────

const clienteMock = {
  id: 1, nombre: "Juan Pérez", activo: true,
  saldoDeuda: 0, limiteCredito: 2000000,
};
const productaMock = {
  codigo: "CEM-001", descripcion: "Cemento Gris 50kg",
  activo: true, precioVenta: 25000,
};
const stockMock    = { sedeId: 1, productoId: "CEM-001", stockActual: 100 };
const creadorMock  = { id: 1, usuario: "admin", rol: "Admin", sedeId: 1, activo: true };

const pedidoMock = {
  id: 1, estado: "Pendiente", observaciones: null, totalRecibido: null,
  creadoEn: new Date(), actualizadoEn: new Date(), creadoPorId: 1, clienteId: 1,
  cliente:  { id: 1, nombre: "Juan Pérez", telefono: null },
  creador:  { id: 1, nombreCompleto: "Administrador" },
  detalles: [
    { id: 1, productoId: "CEM-001", productoNombre: "Cemento Gris 50kg",
      cantidad: 2, precioUnitario: 25000, subtotal: 50000,
      producto: { codigo: "CEM-001", descripcion: "Cemento Gris 50kg" } },
  ],
  asignaciones: [],
};

const sesionAdminMock = {
  id: 10, activa: true, expiraEn: new Date(Date.now() + 86400000),
  usuario: { id: 1, usuario: "admin", rol: "Admin", sedeId: 1, activo: true },
};
const sesionBodegaMock = {
  ...sesionAdminMock, id: 11,
  usuario: { ...sesionAdminMock.usuario, id: 2, rol: "Bodega" },
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let app, tokenAdmin, tokenBodega;

beforeAll(async () => {
  process.env.NODE_ENV     = "test";
  process.env.JWT_SECRET   = "test-secret-clave-super-segura-32chars";
  process.env.DATABASE_URL = "mysql://mock:mock@localhost/mock";

  app = await buildApp();
  app.prisma = prisma;
  await app.ready();

  tokenAdmin  = app.jwt.sign({ sesionId: 10 });
  tokenBodega = app.jwt.sign({ sesionId: 11 });
});

afterAll(async () => { await app.close(); });

function authAdmin()  { return { Authorization: `Bearer ${tokenAdmin}` }; }
function authBodega() { return { Authorization: `Bearer ${tokenBodega}` }; }
function mockSesion(mock) { prisma.sesion.findFirst.mockResolvedValue(mock); }

// Helpers: mockear métodos específicos SIN reemplazar el objeto completo
function mockPedidoFindUnique(value)  { prisma.pedido.findUnique.mockResolvedValue(value); }
function mockPedidoFindMany(value)    { prisma.pedido.findMany.mockResolvedValue(value); }
function mockPedidoUpdate(value)      { prisma.pedido.update.mockResolvedValue(value); }

// ── POST /api/v1/pedidos ──────────────────────────────────────────────────────

describe("POST /api/v1/pedidos", () => {
  const payload = { clienteId: 1, items: [{ productoId: "CEM-001", cantidad: 2 }] };

  // El body tiene required: [clienteId, items] → enviar payload válido para que
  // preValidation (auth) corra antes de que el schema rechace con 400
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/pedidos",
      payload,  // body válido; solo falta el token
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si el cliente no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST", url: "/api/v1/pedidos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 400 si el cliente está inactivo", async () => {
    mockSesion(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue({ ...clienteMock, activo: false });

    const res = await app.inject({
      method: "POST", url: "/api/v1/pedidos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 404 si un producto no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.producto.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST", url: "/api/v1/pedidos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 400 si un producto está inactivo", async () => {
    mockSesion(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.producto.findUnique.mockResolvedValue({ ...productaMock, activo: false });

    const res = await app.inject({
      method: "POST", url: "/api/v1/pedidos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 400 si no hay stock suficiente", async () => {
    mockSesion(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.producto.findUnique.mockResolvedValue(productaMock);
    prisma.stockSede.findUnique.mockResolvedValue({ ...stockMock, stockActual: 1 });

    const res = await app.inject({
      method: "POST", url: "/api/v1/pedidos",
      headers: authAdmin(),
      payload: { clienteId: 1, items: [{ productoId: "CEM-001", cantidad: 50 }] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/stock/i);
  });

  it("debería retornar 400 si supera el límite de crédito", async () => {
    mockSesion(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue({ ...clienteMock, limiteCredito: 10 });
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.producto.findUnique.mockResolvedValue(productaMock);
    prisma.stockSede.findUnique.mockResolvedValue(stockMock);

    const res = await app.inject({
      method: "POST", url: "/api/v1/pedidos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/crédito/i);
  });

  it("debería retornar 201 al crear correctamente (Admin)", async () => {
    mockSesion(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.producto.findUnique.mockResolvedValue(productaMock);
    prisma.stockSede.findUnique.mockResolvedValue(stockMock);
    prisma.$transaction.mockResolvedValue(pedidoMock);

    const res = await app.inject({
      method: "POST", url: "/api/v1/pedidos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().estado).toBe("Pendiente");
  });

  it("debería retornar 201 al crear correctamente (Bodega)", async () => {
    mockSesion(sesionBodegaMock);
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);
    prisma.usuario.findUnique.mockResolvedValue({ ...creadorMock, id: 2, rol: "Bodega" });
    prisma.producto.findUnique.mockResolvedValue(productaMock);
    prisma.stockSede.findUnique.mockResolvedValue(stockMock);
    prisma.$transaction.mockResolvedValue(pedidoMock);

    const res = await app.inject({
      method: "POST", url: "/api/v1/pedidos",
      headers: authBodega(), payload,
    });
    expect(res.statusCode).toBe(201);
  });
});

// ── GET /api/v1/pedidos ───────────────────────────────────────────────────────

describe("GET /api/v1/pedidos", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/pedidos" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con la lista (Admin ve todos)", async () => {
    mockSesion(sesionAdminMock);
    mockPedidoFindMany([pedidoMock]);

    const res = await app.inject({
      method: "GET", url: "/api/v1/pedidos",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("debería retornar 200 (Bodega ve solo su sede)", async () => {
    mockSesion(sesionBodegaMock);
    mockPedidoFindMany([pedidoMock]);

    const res = await app.inject({
      method: "GET", url: "/api/v1/pedidos",
      headers: authBodega(),
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── GET /api/v1/pedidos/:id ───────────────────────────────────────────────────

describe("GET /api/v1/pedidos/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/pedidos/1" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si el pedido no existe", async () => {
    mockSesion(sesionAdminMock);
    mockPedidoFindUnique(null);

    const res = await app.inject({
      method: "GET", url: "/api/v1/pedidos/999",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 con el detalle del pedido", async () => {
    mockSesion(sesionAdminMock);
    mockPedidoFindUnique(pedidoMock);

    const res = await app.inject({
      method: "GET", url: "/api/v1/pedidos/1",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().detalles).toHaveLength(1);
  });
});

// ── PATCH /api/v1/pedidos/:id/estado ─────────────────────────────────────────

describe("PATCH /api/v1/pedidos/:id/estado", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/pedidos/1/estado",
      payload: { estado: "Cancelado" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 403 si el rol es Bodega", async () => {
    mockSesion(sesionBodegaMock);

    const res = await app.inject({
      method: "PATCH", url: "/api/v1/pedidos/1/estado",
      headers: authBodega(), payload: { estado: "Cancelado" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 404 si el pedido no existe", async () => {
    mockSesion(sesionAdminMock);
    mockPedidoFindUnique(null);

    const res = await app.inject({
      method: "PATCH", url: "/api/v1/pedidos/999/estado",
      headers: authAdmin(), payload: { estado: "Cancelado" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 400 para transición inválida (Entregado→Cancelado)", async () => {
    mockSesion(sesionAdminMock);
    mockPedidoFindUnique({ ...pedidoMock, estado: "Entregado" });

    const res = await app.inject({
      method: "PATCH", url: "/api/v1/pedidos/1/estado",
      headers: authAdmin(), payload: { estado: "Cancelado" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 200 al cancelar un pedido Pendiente", async () => {
    const cancelado = { ...pedidoMock, estado: "Cancelado" };
    mockSesion(sesionAdminMock);
    prisma.pedido.findUnique
      .mockResolvedValueOnce(pedidoMock)
      .mockResolvedValueOnce(cancelado);
    mockPedidoUpdate(cancelado);
    prisma.usuario.findUnique.mockResolvedValue(creadorMock);
    prisma.$transaction.mockImplementation(async (fn) => {
      await fn({
        stockSede: { update: vi.fn() },
        cliente:   { update: vi.fn() },
        pedido:    { update: vi.fn() },
      });
    });

    const res = await app.inject({
      method: "PATCH", url: "/api/v1/pedidos/1/estado",
      headers: authAdmin(), payload: { estado: "Cancelado" },
    });
    expect(res.statusCode).toBe(200);
  });
});
