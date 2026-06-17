/**
 * Tests de integración — rutas HTTP de Egreso
 *
 * Rutas cubiertas:
 *  POST   /api/v1/egresos
 *  GET    /api/v1/egresos
 *  GET    /api/v1/egresos/:id
 *  PATCH  /api/v1/egresos/:id
 *  DELETE /api/v1/egresos/:id
 *  GET    /api/v1/egresos/resumen-semanal
 *  GET    /api/v1/egresos/resumen-concepto
 *  GET    /api/v1/egresos/totales-dia
 */
const { buildApp } = require("../src/app");
const { prisma }   = require("./__mocks__/prisma");

// ── Datos de prueba ───────────────────────────────────────────────────────────

const sedeMock   = { id: 1, nombre: "Bogotá" };
const egresoMock = {
  id: 1,
  fecha:       new Date("2026-05-05T00:00:00.000Z"),
  semana:      18,
  sedeId:      1,
  concepto:    "Transporte",
  total:       80000,
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

// ── POST /api/v1/egresos ──────────────────────────────────────────────────────

describe("POST /api/v1/egresos", () => {
  const payload = {
    fecha:    "2026-05-05",
    semana:   18,
    sedeId:   1,
    concepto: "Transporte",
    total:    80000,
  };

  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/egresos", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si la sede no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST", url: "/api/v1/egresos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 201 al registrar correctamente (Admin)", async () => {
    mockSesion(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.egreso = { create: vi.fn().mockResolvedValue(egresoMock) };

    const res = await app.inject({
      method: "POST", url: "/api/v1/egresos",
      headers: authAdmin(), payload,
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().concepto).toBe("Transporte");
  });

  it("debería retornar 201 al registrar correctamente (Bodega)", async () => {
    mockSesion(sesionBodegaMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.egreso = { create: vi.fn().mockResolvedValue(egresoMock) };

    const res = await app.inject({
      method: "POST", url: "/api/v1/egresos",
      headers: authBodega(), payload,
    });
    expect(res.statusCode).toBe(201);
  });
});

// ── GET /api/v1/egresos ───────────────────────────────────────────────────────

describe("GET /api/v1/egresos", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/egresos" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con la lista", async () => {
    mockSesion(sesionAdminMock);
    prisma.egreso = { findMany: vi.fn().mockResolvedValue([egresoMock]) };

    const res = await app.inject({
      method: "GET", url: "/api/v1/egresos",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });
});

// ── GET /api/v1/egresos/:id ───────────────────────────────────────────────────

describe("GET /api/v1/egresos/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/egresos/1" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si el egreso no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.egreso = { findUnique: vi.fn().mockResolvedValue(null) };

    const res = await app.inject({
      method: "GET", url: "/api/v1/egresos/999",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 con el egreso", async () => {
    mockSesion(sesionAdminMock);
    prisma.egreso = { findUnique: vi.fn().mockResolvedValue(egresoMock) };

    const res = await app.inject({
      method: "GET", url: "/api/v1/egresos/1",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(1);
  });
});

// ── PATCH /api/v1/egresos/:id ─────────────────────────────────────────────────

describe("PATCH /api/v1/egresos/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "PATCH", url: "/api/v1/egresos/1",
      payload: { total: 90000 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si el egreso no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.egreso = { findUnique: vi.fn().mockResolvedValue(null) };

    const res = await app.inject({
      method: "PATCH", url: "/api/v1/egresos/999",
      headers: authAdmin(), payload: { total: 90000 },
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 al editar correctamente", async () => {
    const actualizado = { ...egresoMock, total: 90000 };
    mockSesion(sesionAdminMock);
    prisma.egreso = {
      findUnique: vi.fn().mockResolvedValue(egresoMock),
      update:     vi.fn().mockResolvedValue(actualizado),
    };

    const res = await app.inject({
      method: "PATCH", url: "/api/v1/egresos/1",
      headers: authAdmin(), payload: { total: 90000 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().total).toBe(90000);
  });
});

// ── DELETE /api/v1/egresos/:id ────────────────────────────────────────────────

describe("DELETE /api/v1/egresos/:id", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "DELETE", url: "/api/v1/egresos/1" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 403 si el rol es Bodega", async () => {
    mockSesion(sesionBodegaMock);

    const res = await app.inject({
      method: "DELETE", url: "/api/v1/egresos/1",
      headers: authBodega(),
    });
    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 404 si el egreso no existe", async () => {
    mockSesion(sesionAdminMock);
    prisma.egreso = { findUnique: vi.fn().mockResolvedValue(null) };

    const res = await app.inject({
      method: "DELETE", url: "/api/v1/egresos/999",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 al eliminar correctamente", async () => {
    mockSesion(sesionAdminMock);
    prisma.egreso = {
      findUnique: vi.fn().mockResolvedValue(egresoMock),
      delete:     vi.fn().mockResolvedValue(egresoMock),
    };

    const res = await app.inject({
      method: "DELETE", url: "/api/v1/egresos/1",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
  });
});

// ── GET /api/v1/egresos/resumen-semanal ───────────────────────────────────────

describe("GET /api/v1/egresos/resumen-semanal", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/egresos/resumen-semanal?semana=18",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con el resumen por sede", async () => {
    mockSesion(sesionAdminMock);
    prisma.egreso = {
      groupBy: vi.fn().mockResolvedValue([
        { sedeId: 1, _sum: { total: 80000 }, _count: { id: 2 } },
      ]),
    };
    prisma.sede.findMany.mockResolvedValue([{ id: 1, nombre: "Bogotá" }]);

    const res = await app.inject({
      method: "GET", url: "/api/v1/egresos/resumen-semanal?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.porSede[0].sede).toBe("Bogotá");
    expect(body.totalGeneral).toBe(80000);
  });
});

// ── GET /api/v1/egresos/resumen-concepto ──────────────────────────────────────

describe("GET /api/v1/egresos/resumen-concepto", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/egresos/resumen-concepto?semana=18",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con el resumen por concepto", async () => {
    mockSesion(sesionAdminMock);
    prisma.egreso = {
      groupBy: vi.fn().mockResolvedValue([
        { concepto: "Transporte", _sum: { total: 80000 }, _count: { id: 3 } },
      ]),
    };

    const res = await app.inject({
      method: "GET", url: "/api/v1/egresos/resumen-concepto?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body[0].concepto).toBe("Transporte");
  });
});

// ── GET /api/v1/egresos/totales-dia ───────────────────────────────────────────

describe("GET /api/v1/egresos/totales-dia", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET", url: "/api/v1/egresos/totales-dia?semana=18",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con los totales por día", async () => {
    mockSesion(sesionAdminMock);
    prisma.egreso = {
      groupBy: vi.fn().mockResolvedValue([
        { fecha: new Date("2026-05-05"), _sum: { total: 80000 } },
      ]),
    };

    const res = await app.inject({
      method: "GET", url: "/api/v1/egresos/totales-dia?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
  });
});
