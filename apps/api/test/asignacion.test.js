/**
 * Tests de integración — rutas HTTP de AsignacionEntrega
 */
const { buildApp } = require("../src/app");
const { prisma } = require("./__mocks__/prisma");

// ── Datos de prueba ───────────────────────────────────────────────────────────

const pedidoPendienteMock = {
  id: 1,
  estado: "Pendiente",
  clienteId: 1,
  sedeId: 1,
};
const entregadorMock = {
  id: 3,
  nombreCompleto: "Carlos Entregador",
  rol: "Entregador",
  activo: true,
};

const asignacionMock = {
  id: 1,
  pedidoId: 1,
  entregadorId: 3,
  asignadoPorId: 2,
  estado: "Pendiente",
  montoCobrado: null,
  metodoPago: null,
  fechaConfirmada: null,
  observacionesEntrega: null,
  asignadoEn: new Date(),
  pedido: {
    id: 1,
    estado: "Asignado",
    observaciones: null,
    cliente: { id: 1, nombre: "Juan Pérez", telefono: null },
  },
  entregador: { id: 3, nombreCompleto: "Carlos Entregador", telefono: null },
  asignador: { id: 2, nombreCompleto: "Bodega User" },
};

const sesionAdminMock = {
  id: 10,
  activa: true,
  expiraEn: new Date(Date.now() + 86400000),
  usuario: { id: 1, usuario: "admin", rol: "Admin", sedeId: 1, activo: true },
};
const sesionBodegaMock = {
  ...sesionAdminMock,
  id: 11,
  usuario: { ...sesionAdminMock.usuario, id: 2, rol: "Bodega" },
};
const sesionEntregadorMock = {
  ...sesionAdminMock,
  id: 12,
  usuario: { ...sesionAdminMock.usuario, id: 3, rol: "Entregador" },
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let app, tokenAdmin, tokenBodega, tokenEntregador;

beforeAll(async () => {
  app = await buildApp();
  app.prisma = prisma;
  await app.ready();

  tokenAdmin = app.jwt.sign({ sesionId: 10 });
  tokenBodega = app.jwt.sign({ sesionId: 11 });
  tokenEntregador = app.jwt.sign({ sesionId: 12 });
}, 30000);

afterAll(async () => {
  await app.close();
});

function authAdmin() {
  return { Authorization: `Bearer ${tokenAdmin}` };
}
function authBodega() {
  return { Authorization: `Bearer ${tokenBodega}` };
}
function authEntregador() {
  return { Authorization: `Bearer ${tokenEntregador}` };
}
function mockSesion(mock) {
  prisma.sesion.findFirst.mockResolvedValue(mock);
}

// Helpers: mockear métodos individuales, NUNCA reemplazar el objeto entero
function mockPedidoFindUnique(v) {
  prisma.pedido.findUnique.mockResolvedValue(v);
}
function mockAsigFindUnique(v) {
  prisma.asignacionEntrega.findUnique.mockResolvedValue(v);
}
function mockAsigFindMany(v) {
  prisma.asignacionEntrega.findMany.mockResolvedValue(v);
}
function mockAsigUpdate(v) {
  prisma.asignacionEntrega.update.mockResolvedValue(v);
}

// ── POST /api/v1/asignaciones ─────────────────────────────────────────────────

describe("POST /api/v1/asignaciones", () => {
  // body tiene required: [pedidoId, entregadorId] → enviar payload válido para
  // que preValidation (auth) corra ANTES de que Fastify rechace el body con 400
  const payload = { pedidoId: 1, entregadorId: 3 };

  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/asignaciones",
      payload, // body válido, sin token
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 403 si el rol es Entregador", async () => {
    mockSesion(sesionEntregadorMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/asignaciones",
      headers: authEntregador(),
      payload,
    });
    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 404 si el pedido no existe", async () => {
    mockSesion(sesionBodegaMock);
    mockPedidoFindUnique(null);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/asignaciones",
      headers: authBodega(),
      payload,
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 400 si el pedido no está Pendiente", async () => {
    mockSesion(sesionBodegaMock);
    mockPedidoFindUnique({ ...pedidoPendienteMock, estado: "Asignado" });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/asignaciones",
      headers: authBodega(),
      payload,
    });
    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 404 si el entregador no existe", async () => {
    mockSesion(sesionBodegaMock);
    mockPedidoFindUnique(pedidoPendienteMock);
    prisma.usuario.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/asignaciones",
      headers: authBodega(),
      payload,
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 400 si el usuario no tiene rol Entregador", async () => {
    mockSesion(sesionBodegaMock);
    mockPedidoFindUnique(pedidoPendienteMock);
    prisma.usuario.findUnique.mockResolvedValue({
      ...entregadorMock,
      rol: "Bodega",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/asignaciones",
      headers: authBodega(),
      payload,
    });
    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 400 si el entregador está inactivo", async () => {
    mockSesion(sesionBodegaMock);
    mockPedidoFindUnique(pedidoPendienteMock);
    prisma.usuario.findUnique.mockResolvedValue({
      ...entregadorMock,
      activo: false,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/asignaciones",
      headers: authBodega(),
      payload,
    });
    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 201 al crear correctamente", async () => {
    mockSesion(sesionBodegaMock);
    mockPedidoFindUnique(pedidoPendienteMock);
    prisma.usuario.findUnique.mockResolvedValue(entregadorMock);
    prisma.$transaction.mockResolvedValue({ id: 1 });
    mockAsigFindUnique(asignacionMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/asignaciones",
      headers: authBodega(),
      payload,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().pedidoId).toBe(1);
  });
});

// ── GET /api/v1/asignaciones ──────────────────────────────────────────────────

describe("GET /api/v1/asignaciones", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/asignaciones",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 403 si el rol es Entregador", async () => {
    mockSesion(sesionEntregadorMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/asignaciones",
      headers: authEntregador(),
    });
    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 200 con la lista (Bodega)", async () => {
    mockSesion(sesionBodegaMock);
    mockAsigFindMany([asignacionMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/asignaciones",
      headers: authBodega(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });
});

// ── GET /api/v1/asignaciones/mis-entregas ─────────────────────────────────────

describe("GET /api/v1/asignaciones/mis-entregas", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/asignaciones/mis-entregas",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con las entregas del entregador autenticado", async () => {
    mockSesion(sesionEntregadorMock);
    mockAsigFindMany([asignacionMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/asignaciones/mis-entregas",
      headers: authEntregador(),
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── GET /api/v1/asignaciones/:id ──────────────────────────────────────────────

describe("GET /api/v1/asignaciones/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/asignaciones/1",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si la asignación no existe", async () => {
    mockSesion(sesionAdminMock);
    mockAsigFindUnique(null);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/asignaciones/999",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 con la asignación", async () => {
    mockSesion(sesionAdminMock);
    mockAsigFindUnique(asignacionMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/asignaciones/1",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(1);
  });
});

// ── PATCH /api/v1/asignaciones/:id/estado ────────────────────────────────────

describe("PATCH /api/v1/asignaciones/:id/estado", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      payload: { nuevoEstado: "EnRuta" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si la asignación no existe", async () => {
    mockSesion(sesionEntregadorMock);
    mockAsigFindUnique(null);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/999/estado",
      headers: authEntregador(),
      payload: { nuevoEstado: "EnRuta" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 403 si el Entregador intenta actualizar asignación ajena", async () => {
    mockSesion(sesionEntregadorMock); // id=3
    mockAsigFindUnique({ ...asignacionMock, entregadorId: 99 });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: { nuevoEstado: "EnRuta" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 400 para transición inválida (Entregado→EnRuta)", async () => {
    mockSesion(sesionEntregadorMock);
    mockAsigFindUnique({ ...asignacionMock, estado: "Entregado" });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: { nuevoEstado: "EnRuta" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 400 al confirmar Entregado sin montoCobrado", async () => {
    mockSesion(sesionEntregadorMock);
    mockAsigFindUnique({ ...asignacionMock, estado: "EnRuta" });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: { nuevoEstado: "Entregado", metodoPago: "Efectivo" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 200 al pasar a EnRuta", async () => {
    const enRuta = { ...asignacionMock, estado: "EnRuta" };
    mockSesion(sesionEntregadorMock);
    mockAsigFindUnique(asignacionMock);
    mockAsigUpdate(enRuta);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: { nuevoEstado: "EnRuta" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().estado).toBe("EnRuta");
  });

  it("debería retornar 200 al confirmar Entregado con todos los campos", async () => {
    const entregado = {
      ...asignacionMock,
      estado: "Entregado",
      montoCobrado: 50000,
      metodoPago: "Efectivo",
    };
    mockSesion(sesionEntregadorMock);
    prisma.asignacionEntrega.findUnique
      .mockResolvedValueOnce({ ...asignacionMock, estado: "EnRuta" })
      .mockResolvedValueOnce(entregado);
    prisma.$transaction.mockImplementation(async (fn) => {
      await fn({
        asignacionEntrega: { update: vi.fn() },
        pedido: { update: vi.fn() },
        cliente: { update: vi.fn() },
      });
    });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: {
        nuevoEstado: "Entregado",
        montoCobrado: 50000,
        metodoPago: "Efectivo",
      },
    });
    expect(res.statusCode).toBe(200);
  });

  it("debería retornar 200 al confirmar Entregado con metodoPago Mixto", async () => {
    mockSesion(sesionEntregadorMock);
    prisma.asignacionEntrega.findUnique
      .mockResolvedValueOnce({ ...asignacionMock, estado: "EnRuta" })
      .mockResolvedValueOnce({
        ...asignacionMock,
        estado: "Entregado",
        montoCobrado: 50000,
        montoEfectivo: 30000,
        montoTransferencia: 20000,
        metodoPago: "Mixto",
      });
    const tx = {
      asignacionEntrega: { update: vi.fn() },
      pedido: { update: vi.fn() },
      cliente: { update: vi.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(tx));

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: {
        nuevoEstado: "Entregado",
        montoCobrado: 50000,
        metodoPago: "Mixto",
        montoEfectivo: 30000,
        montoTransferencia: 20000,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(tx.cliente.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { saldoDeuda: { decrement: 50000 } },
    });
  });

  it("debería retornar 400 si Mixto no suma lo mismo que montoCobrado", async () => {
    mockSesion(sesionEntregadorMock);
    mockAsigFindUnique({ ...asignacionMock, estado: "EnRuta" });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: {
        nuevoEstado: "Entregado",
        montoCobrado: 50000,
        metodoPago: "Mixto",
        montoEfectivo: 10000,
        montoTransferencia: 20000,
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 400 si Mixto no incluye montoEfectivo/montoTransferencia", async () => {
    mockSesion(sesionEntregadorMock);
    mockAsigFindUnique({ ...asignacionMock, estado: "EnRuta" });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: { nuevoEstado: "Entregado", montoCobrado: 50000, metodoPago: "Mixto" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 200 al confirmar con metodoPago Credito y montoCobrado 0", async () => {
    mockSesion(sesionEntregadorMock);
    prisma.asignacionEntrega.findUnique
      .mockResolvedValueOnce({ ...asignacionMock, estado: "EnRuta" })
      .mockResolvedValueOnce({ ...asignacionMock, estado: "Entregado", montoCobrado: 0, metodoPago: "Credito" });
    prisma.$transaction.mockImplementation(async (fn) =>
      fn({
        asignacionEntrega: { update: vi.fn() },
        pedido: { update: vi.fn() },
        cliente: { update: vi.fn() },
      }),
    );

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: { nuevoEstado: "Entregado", montoCobrado: 0, metodoPago: "Credito" },
    });

    expect(res.statusCode).toBe(200);
  });

  it("debería retornar 400 si Credito viene con montoCobrado mayor a 0", async () => {
    mockSesion(sesionEntregadorMock);
    mockAsigFindUnique({ ...asignacionMock, estado: "EnRuta" });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: { nuevoEstado: "Entregado", montoCobrado: 20000, metodoPago: "Credito" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("debería aceptar un abonoDeuda adicional y descontarlo del saldoDeuda junto con montoCobrado", async () => {
    mockSesion(sesionEntregadorMock);
    prisma.asignacionEntrega.findUnique
      .mockResolvedValueOnce({
        ...asignacionMock,
        estado: "EnRuta",
        pedido: {
          ...asignacionMock.pedido,
          sedeId: 1,
          cliente: { id: 1, nombre: "Juan Pérez", telefono: null, saldoDeuda: 100000 },
        },
      })
      .mockResolvedValueOnce({ ...asignacionMock, estado: "Entregado" });
    const tx = {
      asignacionEntrega: { update: vi.fn() },
      pedido: { update: vi.fn() },
      cliente: { update: vi.fn() },
      ingreso: { create: vi.fn() },
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(tx));

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: {
        nuevoEstado: "Entregado",
        montoCobrado: 50000,
        metodoPago: "Efectivo",
        abonoDeuda: 30000,
      },
    });

    expect(res.statusCode).toBe(200);
    expect(tx.cliente.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { saldoDeuda: { decrement: 80000 } }, // 50000 (pedido) + 30000 (abono)
    });
    // Ingreso del cobro de la entrega, marcado con origen automático
    expect(tx.ingreso.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          origen: "entrega",
          idReferencia: 1,
          efectivo: 50000,
          total: 50000,
        }),
      }),
    );
    // El abono a deuda anterior genera su propio Ingreso en efectivo
    expect(tx.ingreso.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          origen: "abono-deuda-entrega",
          idReferencia: 1,
          efectivo: 30000,
          total: 30000,
        }),
      }),
    );
  });

  it("debería retornar 400 si el abonoDeuda es mayor al saldoDeuda actual del cliente", async () => {
    mockSesion(sesionEntregadorMock);
    mockAsigFindUnique({
      ...asignacionMock,
      estado: "EnRuta",
      pedido: {
        ...asignacionMock.pedido,
        cliente: { id: 1, nombre: "Juan Pérez", telefono: null, saldoDeuda: 20000 },
      },
    });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/asignaciones/1/estado",
      headers: authEntregador(),
      payload: {
        nuevoEstado: "Entregado",
        montoCobrado: 50000,
        metodoPago: "Efectivo",
        abonoDeuda: 30000,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/abono/i);
  });
});
