/**
 * Tests de integración — rutas HTTP de Cliente
 *
 * Rutas cubiertas:
 *  GET    /api/v1/clientes
 *  GET    /api/v1/clientes/:id
 *  POST   /api/v1/clientes
 *  PATCH  /api/v1/clientes/:id
 *  DELETE /api/v1/clientes/:id
 *
 * Todas las rutas requieren token (adminOBodega o soloAdmin).
 */
const { buildApp } = require("../src/app");
const { prisma } = require("./__mocks__/prisma");

// ── Datos de prueba ───────────────────────────────────────────────────────────

const clienteMock = {
  id: 1,
  nombre: "Juan Pérez",
  telefono: "3001234567",
  activo: true,
  limiteCredito: 0,
  creadoEn: new Date(),
};

const sesionAdminMock = {
  id: 10,
  activa: true,
  expiraEn: new Date(Date.now() + 86400000),
  usuario: {
    id: 1,
    usuario: "admin",
    rol: "Admin",
    sedeId: 1,
    activo: true,
  },
};

const sesionBodegaMock = {
  ...sesionAdminMock,
  id: 11,
  usuario: { ...sesionAdminMock.usuario, rol: "Bodega" },
};

// ── Setup ─────────────────────────────────────────────────────────────────────

let app;
let tokenAdmin;
let tokenBodega;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret-clave-super-segura-32chars";
  process.env.DATABASE_URL = "mysql://mock:mock@localhost/mock";

  app = await buildApp();
  app.prisma = prisma;
  await app.ready();

  tokenAdmin = app.jwt.sign({ sesionId: 10 }, { expiresIn: "15m" });
  tokenBodega = app.jwt.sign({ sesionId: 11 }, { expiresIn: "15m" });
});

afterAll(async () => {
  await app.close();
});

// ── GET /api/v1/clientes ──────────────────────────────────────────────────────

describe("GET /api/v1/clientes", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/clientes" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con lista de clientes (Admin)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.cliente.findMany.mockResolvedValue([clienteMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/clientes",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].nombre).toBe("Juan Pérez");
  });

  it("debería retornar 200 con lista de clientes (Bodega)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);
    prisma.cliente.findMany.mockResolvedValue([clienteMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/clientes",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("debería filtrar por nombre via query string", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.cliente.findMany.mockResolvedValue([clienteMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/clientes?nombre=Juan",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    const callWhere = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(callWhere.nombre).toEqual({ contains: "Juan" });
  });

  it("debería filtrar clientes activos con activo=true", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.cliente.findMany.mockResolvedValue([clienteMock]);

    await app.inject({
      method: "GET",
      url: "/api/v1/clientes?activo=true",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    const callWhere = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(true);
  });
});

// ── GET /api/v1/clientes/:id ──────────────────────────────────────────────────

describe("GET /api/v1/clientes/:id", () => {
  it("debería retornar 200 con el cliente encontrado", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/clientes/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(1);
  });

  it("debería retornar 404 si el cliente no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/clientes/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/no encontrado/i);
  });
});

// ── POST /api/v1/clientes ─────────────────────────────────────────────────────

describe("POST /api/v1/clientes", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/clientes",
      payload: { nombre: "Nuevo Cliente" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 201 al crear un cliente correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.cliente.create.mockResolvedValue({
      ...clienteMock,
      id: 2,
      nombre: "Nuevo Cliente",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/clientes",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombre: "Nuevo Cliente", telefono: "3109876543" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().nombre).toBe("Nuevo Cliente");
  });

  it("debería retornar 400 si falta el campo nombre", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/clientes",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { telefono: "3109876543" },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── PATCH /api/v1/clientes/:id ────────────────────────────────────────────────

describe("PATCH /api/v1/clientes/:id", () => {
  it("debería retornar 200 al actualizar correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);
    prisma.cliente.update.mockResolvedValue({
      ...clienteMock,
      nombre: "Juan Editado",
    });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/clientes/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombre: "Juan Editado" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().nombre).toBe("Juan Editado");
  });

  it("debería retornar 404 si el cliente no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/clientes/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombre: "No existe" },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ── DELETE /api/v1/clientes/:id ───────────────────────────────────────────────

describe("DELETE /api/v1/clientes/:id", () => {
  it("debería retornar 403 si el rol es Bodega (solo Admin puede eliminar)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/clientes/1",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 200 al desactivar un cliente (Admin)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);
    prisma.cliente.update.mockResolvedValue({ ...clienteMock, activo: false });

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/clientes/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().mensaje).toMatch(/desactivado/i);
  });

  it("debería retornar 404 si el cliente no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.cliente.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/clientes/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
  });
});
