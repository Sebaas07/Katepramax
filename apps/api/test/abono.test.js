/**
 * Tests de integración — rutas HTTP de Abono
 *
 * Rutas cubiertas:
 *  POST   /api/v1/abonos
 *  GET    /api/v1/abonos
 *  GET    /api/v1/abonos/:id
 *  PATCH  /api/v1/abonos/:id
 *  DELETE /api/v1/abonos/:id
 *  GET    /api/v1/abonos/resumen-proveedor
 *  GET    /api/v1/abonos/resumen-sede
 */
const { buildApp } = require("../src/app");
const { prisma }   = require("./__mocks__/prisma");

// ── Datos de prueba ───────────────────────────────────────────────────────────

const proveedorMock = { id: 1, nombre: "Cemex S.A.", activo: true };
const sedeMock      = { id: 1, nombre: "Bogotá" };

const abonoMock = {
  id: 1,
  fecha:       new Date("2026-05-05T00:00:00.000Z"),
  semana:      18,
  proveedorId: 1,
  sedeId:      1,
  valorPagado: 500000,
  observacion: null,
  creadoEn:    new Date(),
  proveedor:   { id: 1, nombre: "Cemex S.A." },
  sede:        { id: 1, nombre: "Bogotá" },
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
  usuario: { ...sesionAdminMock.usuario, rol: "Bodega" },
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let app, tokenAdmin, tokenBodega;

beforeAll(async () => {
  app = await buildApp();
  app.prisma = prisma;
  await app.ready();

  tokenAdmin  = app.jwt.sign({ sesionId: 10 });
  tokenBodega = app.jwt.sign({ sesionId: 11 });
}, 15000);

afterAll(async () => { await app.close(); });

// ── Helpers ───────────────────────────────────────────────────────────────────

function authAdmin()  { return { Authorization: `Bearer ${tokenAdmin}` }; }
function authBodega() { return { Authorization: `Bearer ${tokenBodega}` }; }

function mockSesion(mock) {
  prisma.sesion.findFirst.mockResolvedValue(mock);
}

// ── POST /api/v1/abonos ───────────────────────────────────────────────────────

describe("POST /api/v1/abonos", () => {
  const payload = {
    fecha:       "2026-05-05",
    semana:      18,
    proveedorId: 1,
    sedeId:      1,
    valorPagado: 500000,
  };

  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/abonos", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si el proveedor no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST", url: "/api/v1/abonos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 422 si el proveedor está inactivo", async () => {
    mockSesion(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue({ ...proveedorMock, activo: false });

    const res = await app.inject({
      method: "POST", url: "/api/v1/abonos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(422);
  });

  it("debería retornar 404 si la sede no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.sede.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST", url: "/api/v1/abonos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 201 al registrar correctamente (Admin)", async () => {
    mockSesion(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    // FIX: mockear método individual, no reemplazar el objeto del mock centralizado
    prisma.abono.create.mockResolvedValue(abonoMock);

    const res = await app.inject({
      method: "POST", url: "/api/v1/abonos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.proveedor.nombre).toBe("Cemex S.A.");
  });

  it("debería retornar 201 al registrar correctamente (Bodega)", async () => {
    mockSesion(sesionBodegaMock);
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    // FIX: mockear método individual, no reemplazar el objeto del mock centralizado
    prisma.abono.create.mockResolvedValue(abonoMock);

    const res = await app.inject({
      method: "POST", url: "/api/v1/abonos",
      headers: authBodega(), payload,
    });
    expect(res.statusCode).toBe(201);
  });
});

// ── GET /api/v1/abonos ────────────────────────────────────────────────────────

describe("GET /api/v1/abonos", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/abonos" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con la lista de abonos", async () => {
    mockSesion(sesionAdminMock);
    // FIX: mockear método individual
    prisma.abono.findMany.mockResolvedValue([abonoMock]);

    const res = await app.inject({
      method: "GET", url: "/api/v1/abonos",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);
  });

  it("debería filtrar por semana", async () => {
    mockSesion(sesionAdminMock);
    // FIX: mockear método individual
    prisma.abono.findMany.mockResolvedValue([abonoMock]);

    const res = await app.inject({
      method: "GET", url: "/api/v1/abonos?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── GET /api/v1/abonos/:id ────────────────────────────────────────────────────

describe("GET /api/v1/abonos/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/abonos/1" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si el abono no existe", async () => {
    mockSesion(sesionAdminMock);
    // FIX: mockear método individual
    prisma.abono.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "GET", url: "/api/v1/abonos/999",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 con el abono", async () => {
    mockSesion(sesionAdminMock);
    // FIX: mockear método individual
    prisma.abono.findUnique.mockResolvedValue(abonoMock);

    const res = await app.inject({
      method: "GET", url: "/api/v1/abonos/1",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(1);
  });
});

// ── PATCH /api/v1/abonos/:id ──────────────────────────────────────────────────

describe("PATCH /api/v1/abonos/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/abonos/1",
      payload: { valorPagado: 600000 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si el abono no existe", async () => {
    mockSesion(sesionAdminMock);
    // FIX: mockear método individual
    prisma.abono.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "PATCH", url: "/api/v1/abonos/999",
      headers: authAdmin(), payload: { valorPagado: 600000 },
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 al editar correctamente", async () => {
    const actualizado = { ...abonoMock, valorPagado: 600000 };
    mockSesion(sesionAdminMock);
    // FIX: mockear métodos individuales
    prisma.abono.findUnique.mockResolvedValue(abonoMock);
    prisma.abono.update.mockResolvedValue(actualizado);
    prisma.egreso.findFirst.mockResolvedValue(null);

    const res = await app.inject({
      method: "PATCH", url: "/api/v1/abonos/1",
      headers: authAdmin(), payload: { valorPagado: 600000 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().valorPagado).toBe(600000);
  });
});

// ── DELETE /api/v1/abonos/:id ─────────────────────────────────────────────────

describe("DELETE /api/v1/abonos/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "DELETE", url: "/api/v1/abonos/1" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 403 si el rol es Bodega", async () => {
    mockSesion(sesionBodegaMock);

    const res = await app.inject({
      method: "DELETE", url: "/api/v1/abonos/1",
      headers: authBodega(),
    });
    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 404 si el abono no existe", async () => {
    mockSesion(sesionAdminMock);
    // FIX: mockear método individual
    prisma.abono.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "DELETE", url: "/api/v1/abonos/999",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 al eliminar correctamente", async () => {
    mockSesion(sesionAdminMock);
    // FIX: mockear métodos individuales
    prisma.abono.findUnique.mockResolvedValue(abonoMock);
    prisma.abono.delete.mockResolvedValue(abonoMock);
    prisma.egreso.deleteMany.mockResolvedValue({ count: 1 });

    const res = await app.inject({
      method: "DELETE", url: "/api/v1/abonos/1",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── GET /api/v1/abonos/resumen-proveedor ──────────────────────────────────────

describe("GET /api/v1/abonos/resumen-proveedor", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/abonos/resumen-proveedor?semana=18",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con el resumen por proveedor", async () => {
    mockSesion(sesionAdminMock);
    // FIX: mockear métodos individuales
    prisma.abono.groupBy.mockResolvedValue([
      { proveedorId: 1, _sum: { valorPagado: 500000 }, _count: { id: 2 } },
    ]);
    prisma.proveedor.findMany.mockResolvedValue([{ id: 1, nombre: "Cemex S.A." }]);

    const res = await app.inject({
      method: "GET", url: "/api/v1/abonos/resumen-proveedor?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body[0].proveedor).toBe("Cemex S.A.");
    expect(body[0].totalPagado).toBe(500000);
  });
});

// ── GET /api/v1/abonos/resumen-sede ──────────────────────────────────────────

describe("GET /api/v1/abonos/resumen-sede", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/abonos/resumen-sede?semana=18",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con el resumen por sede", async () => {
    mockSesion(sesionAdminMock);
    // FIX: mockear métodos individuales
    prisma.abono.groupBy.mockResolvedValue([
      { sedeId: 1, _sum: { valorPagado: 500000 } },
    ]);
    prisma.sede.findMany.mockResolvedValue([{ id: 1, nombre: "Bogotá" }]);

    const res = await app.inject({
      method: "GET", url: "/api/v1/abonos/resumen-sede?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body[0].sede).toBe("Bogotá");
  });
});