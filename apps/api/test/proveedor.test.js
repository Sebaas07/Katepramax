/**
 * Tests de integración — rutas HTTP de Proveedor
 *
 * Rutas cubiertas:
 *  GET    /api/v1/proveedores          (Admin y Bodega)
 *  GET    /api/v1/proveedores/:id      (Admin y Bodega)
 *  POST   /api/v1/proveedores          (solo Admin)
 *  PATCH  /api/v1/proveedores/:id      (solo Admin)
 *  DELETE /api/v1/proveedores/:id      (solo Admin)
 */
const { buildApp } = require("../src/app");
const { prisma }   = require("./__mocks__/prisma");

// ── Datos de prueba ───────────────────────────────────────────────────────────

const proveedorMock = {
  id: 1,
  nombre: "Cemex Colombia",
  activo: true,
  creadoEn: new Date(),
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

let app;
let tokenAdmin;
let tokenBodega;

beforeAll(async () => {
  process.env.NODE_ENV     = "test";
  process.env.JWT_SECRET   = "test-secret-clave-super-segura-32chars";
  process.env.DATABASE_URL = "mysql://mock:mock@localhost/mock";

  app = await buildApp();
  app.prisma = prisma;
  await app.ready();

  tokenAdmin  = app.jwt.sign({ sesionId: 10 }, { expiresIn: "15m" });
  tokenBodega = app.jwt.sign({ sesionId: 11 }, { expiresIn: "15m" });
});

afterAll(async () => {
  await app.close();
});

// ── GET /api/v1/proveedores ───────────────────────────────────────────────────

describe("GET /api/v1/proveedores", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/proveedores" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con lista de proveedores (Admin)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findMany.mockResolvedValue([proveedorMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/proveedores",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].nombre).toBe("Cemex Colombia");
  });

  it("debería retornar 200 con lista de proveedores (Bodega)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);
    prisma.proveedor.findMany.mockResolvedValue([proveedorMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/proveedores",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("debería filtrar por nombre via query string", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findMany.mockResolvedValue([proveedorMock]);

    await app.inject({
      method: "GET",
      url: "/api/v1/proveedores?nombre=Cemex",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.nombre).toEqual({ contains: "Cemex" });
  });

  it("debería filtrar por activo=false", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findMany.mockResolvedValue([]);

    await app.inject({
      method: "GET",
      url: "/api/v1/proveedores?activo=false",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(false);
  });
});

// ── GET /api/v1/proveedores/:id ───────────────────────────────────────────────

describe("GET /api/v1/proveedores/:id", () => {
  it("debería retornar 200 con el proveedor encontrado", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/proveedores/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(1);
    expect(res.json().nombre).toBe("Cemex Colombia");
  });

  it("debería retornar 404 si el proveedor no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/proveedores/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/no encontrado/i);
  });
});

// ── POST /api/v1/proveedores ──────────────────────────────────────────────────

describe("POST /api/v1/proveedores", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/proveedores",
      payload: { nombre: "Nuevo Proveedor" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 403 si el rol es Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/proveedores",
      headers: { authorization: `Bearer ${tokenBodega}` },
      payload: { nombre: "Nuevo Proveedor" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 409 si el nombre ya existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findFirst.mockResolvedValue(proveedorMock); // nombre ya existe

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/proveedores",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombre: "Cemex Colombia" },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toMatch(/ya existe/i);
  });

  it("debería retornar 400 si falta el campo nombre", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/proveedores",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 201 al crear correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findFirst.mockResolvedValue(null); // nombre libre
    prisma.proveedor.create.mockResolvedValue({ ...proveedorMock, id: 2, nombre: "Nuevo Proveedor" });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/proveedores",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombre: "Nuevo Proveedor" },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().nombre).toBe("Nuevo Proveedor");
  });
});

// ── PATCH /api/v1/proveedores/:id ─────────────────────────────────────────────

describe("PATCH /api/v1/proveedores/:id", () => {
  it("debería retornar 403 si el rol es Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/proveedores/1",
      headers: { authorization: `Bearer ${tokenBodega}` },
      payload: { nombre: "Editado" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 404 si el proveedor no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/proveedores/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombre: "Editado" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 409 si el nuevo nombre ya pertenece a otro proveedor", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.findFirst.mockResolvedValue({ id: 2, nombre: "Nombre Colision" }); // colisión

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/proveedores/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombre: "Nombre Colision" },
    });

    expect(res.statusCode).toBe(409);
  });

  it("debería retornar 200 al actualizar correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.findFirst.mockResolvedValue(null); // sin colisión
    prisma.proveedor.update.mockResolvedValue({ ...proveedorMock, nombre: "Cemex Editado" });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/proveedores/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombre: "Cemex Editado" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().nombre).toBe("Cemex Editado");
  });
});

// ── DELETE /api/v1/proveedores/:id ────────────────────────────────────────────

describe("DELETE /api/v1/proveedores/:id", () => {
  it("debería retornar 403 si el rol es Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/proveedores/1",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 404 si el proveedor no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/proveedores/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 al desactivar correctamente (Admin)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.update.mockResolvedValue({ ...proveedorMock, activo: false });

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/proveedores/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().mensaje).toMatch(/desactivado/i);
  });
});