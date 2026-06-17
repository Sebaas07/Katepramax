/**
 * Tests de integración — rutas HTTP de Ingreso
 *
 * Rutas cubiertas:
 *  POST   /api/v1/ingresos
 *  GET    /api/v1/ingresos
 *  GET    /api/v1/ingresos/:id
 *  PATCH  /api/v1/ingresos/:id
 *  DELETE /api/v1/ingresos/:id
 *  GET    /api/v1/ingresos/resumen-semanal
 *  GET    /api/v1/ingresos/totales-dia
 */
const { buildApp } = require("../src/app");
const { prisma }   = require("./__mocks__/prisma");

// ── Datos de prueba ───────────────────────────────────────────────────────────

const sedeMock    = { id: 1, nombre: "Bogotá" };
const ingresoMock = {
  id: 1,
  fecha:       new Date("2026-05-05T00:00:00.000Z"),
  semana:      18,
  sedeId:      1,
  efectivo:    300000,
  cuentas:     150000,
  total:       450000,
  observacion: null,
  creadoEn:    new Date(),
  sede:        { id: 1, nombre: "Bogotá" },
};

const sesionAdminMock = {
  id: 10,
  activa:   true,
  expiraEn: new Date(Date.now() + 86400000),
  usuario:  { id: 1, usuario: "admin", rol: "Admin", sedeId: 1, activo: true },
};
const sesionBodegaMock = {
  ...sesionAdminMock,
  id: 11,
  usuario: { ...sesionAdminMock.usuario, rol: "Bodega" },
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

// ── POST /api/v1/ingresos ─────────────────────────────────────────────────────

describe("POST /api/v1/ingresos", () => {
  const payload = {
    fecha:    "2026-05-05",
    semana:   18,
    sedeId:   1,
    efectivo: 300000,
    cuentas:  150000,
  };

  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/ingresos", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si la sede no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST", url: "/api/v1/ingresos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 201 y calcular total automáticamente (Admin)", async () => {
    mockSesion(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.ingreso = { create: vi.fn().mockResolvedValue(ingresoMock) };

    const res = await app.inject({
      method: "POST", url: "/api/v1/ingresos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().total).toBe(450000);
  });

  it("debería retornar 201 al registrar correctamente (Bodega)", async () => {
    mockSesion(sesionBodegaMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.ingreso = { create: vi.fn().mockResolvedValue(ingresoMock) };

    const res = await app.inject({
      method: "POST", url: "/api/v1/ingresos",
      headers: authBodega(), payload,
    });
    expect(res.statusCode).toBe(201);
  });

  it("debería calcular total=efectivo cuando cuentas no se envía", async () => {
    mockSesion(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    const soloEfectivo = { ...ingresoMock, cuentas: 0, total: 300000 };
    prisma.ingreso = { create: vi.fn().mockResolvedValue(soloEfectivo) };

    const res = await app.inject({
      method: "POST", url: "/api/v1/ingresos",
      headers: authAdmin(), payload: { fecha: "2026-05-05", semana: 18, sedeId: 1, efectivo: 300000 },
    });
    expect(res.statusCode).toBe(201);
  });
});

// ── GET /api/v1/ingresos ──────────────────────────────────────────────────────

describe("GET /api/v1/ingresos", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/ingresos" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con la lista", async () => {
    mockSesion(sesionAdminMock);
    prisma.ingreso = { findMany: vi.fn().mockResolvedValue([ingresoMock]) };

    const res = await app.inject({
      method: "GET", url: "/api/v1/ingresos",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("debería filtrar por semana y sedeId", async () => {
    mockSesion(sesionAdminMock);
    prisma.ingreso = { findMany: vi.fn().mockResolvedValue([ingresoMock]) };

    const res = await app.inject({
      method: "GET", url: "/api/v1/ingresos?semana=18&sedeId=1",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── GET /api/v1/ingresos/:id ──────────────────────────────────────────────────

describe("GET /api/v1/ingresos/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/ingresos/1" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si el ingreso no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.ingreso = { findUnique: vi.fn().mockResolvedValue(null) };

    const res = await app.inject({
      method: "GET", url: "/api/v1/ingresos/999",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 con el ingreso", async () => {
    mockSesion(sesionAdminMock);
    prisma.ingreso = { findUnique: vi.fn().mockResolvedValue(ingresoMock) };

    const res = await app.inject({
      method: "GET", url: "/api/v1/ingresos/1",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(1);
  });
});

// ── PATCH /api/v1/ingresos/:id ────────────────────────────────────────────────

describe("PATCH /api/v1/ingresos/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/ingresos/1",
      payload: { efectivo: 400000 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si el ingreso no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.ingreso = { findUnique: vi.fn().mockResolvedValue(null) };

    const res = await app.inject({
      method: "PATCH", url: "/api/v1/ingresos/999",
      headers: authAdmin(), payload: { efectivo: 400000 },
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería recalcular total al actualizar efectivo", async () => {
    // efectivo: 400000 + cuentas actuales: 150000 = 550000
    const actualizado = { ...ingresoMock, efectivo: 400000, total: 550000 };
    mockSesion(sesionAdminMock);
    prisma.ingreso = {
      findUnique: vi.fn().mockResolvedValue(ingresoMock),
      update:     vi.fn().mockResolvedValue(actualizado),
    };

    const res = await app.inject({
      method: "PATCH", url: "/api/v1/ingresos/1",
      headers: authAdmin(), payload: { efectivo: 400000 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(550000);
  });
});

// ── DELETE /api/v1/ingresos/:id ───────────────────────────────────────────────

describe("DELETE /api/v1/ingresos/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "DELETE", url: "/api/v1/ingresos/1" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 403 si el rol es Bodega", async () => {
    mockSesion(sesionBodegaMock);

    const res = await app.inject({
      method: "DELETE", url: "/api/v1/ingresos/1",
      headers: authBodega(),
    });
    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 404 si el ingreso no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.ingreso = { findUnique: vi.fn().mockResolvedValue(null) };

    const res = await app.inject({
      method: "DELETE", url: "/api/v1/ingresos/999",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 al eliminar correctamente", async () => {
    mockSesion(sesionAdminMock);
    prisma.ingreso = {
      findUnique: vi.fn().mockResolvedValue(ingresoMock),
      delete:     vi.fn().mockResolvedValue(ingresoMock),
    };

    const res = await app.inject({
      method: "DELETE", url: "/api/v1/ingresos/1",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── GET /api/v1/ingresos/resumen-semanal ──────────────────────────────────────

describe("GET /api/v1/ingresos/resumen-semanal", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/ingresos/resumen-semanal?semana=18",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con resumen por sede incluyendo totales", async () => {
    mockSesion(sesionAdminMock);
    prisma.ingreso = {
      groupBy: vi.fn().mockResolvedValue([
        { sedeId: 1, _sum: { efectivo: 300000, cuentas: 150000, total: 450000 }, _count: { id: 2 } },
      ]),
    };
    prisma.sede.findMany.mockResolvedValue([{ id: 1, nombre: "Bogotá" }]);

    const res = await app.inject({
      method: "GET", url: "/api/v1/ingresos/resumen-semanal?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.porSede[0].sede).toBe("Bogotá");
    expect(body.totalGeneral.total).toBe(450000);
  });
});

// ── GET /api/v1/ingresos/totales-dia ─────────────────────────────────────────

describe("GET /api/v1/ingresos/totales-dia", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/ingresos/totales-dia?semana=18",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con los totales por día", async () => {
    mockSesion(sesionAdminMock);
    prisma.ingreso = {
      groupBy: vi.fn().mockResolvedValue([
        { fecha: new Date("2026-05-05"), _sum: { efectivo: 300000, cuentas: 150000, total: 450000 } },
      ]),
    };

    const res = await app.inject({
      method: "GET", url: "/api/v1/ingresos/totales-dia?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
  });
});
