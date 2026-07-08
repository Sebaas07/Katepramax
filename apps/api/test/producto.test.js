/**
 * Tests de integración — rutas HTTP de Producto
 *
 * Rutas cubiertas:
 *  GET    /api/v1/productos
 *  GET    /api/v1/productos/:codigo
 *  POST   /api/v1/productos          (solo Admin)
 *  PATCH  /api/v1/productos/:codigo  (Admin y Bodega)
 *  DELETE /api/v1/productos/:codigo  (solo Admin)
 *
 * Nota: "codigo" es Int autoincrement en Prisma (no lo envía el cliente
 * en el POST; el schema de la ruta lo rechazaría con additionalProperties:false).
 */
const { buildApp } = require("../src/app");
const { prisma } = require("./__mocks__/prisma");

// ── Datos de prueba ───────────────────────────────────────────────────────────

const productoMock = {
  id: 1,
  codigo: 1,
  descripcion: "Cemento Gris 50kg",
  precioCosto: 18000,
  precioVenta: 25000,
  precioMayoreo: 22000,
  porcentajeGanancia: 38.8,
  activo: true,
  proveedorId: 1,
  proveedor: { id: 1, nombre: "Proveedor Test" },
  stockSedes: [{ sedeId: 1, stockActual: 10 }],
};

const proveedorMock = { id: 1, nombre: "Proveedor Test", activo: true };

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
  app = await buildApp();
  app.prisma = prisma;
  await app.ready();

  tokenAdmin = app.jwt.sign({ sesionId: 10 }, { expiresIn: "15m" });
  tokenBodega = app.jwt.sign({ sesionId: 11 }, { expiresIn: "15m" });
});

afterAll(async () => {
  await app.close();
});

// ── GET /api/v1/productos ─────────────────────────────────────────────────────

describe("GET /api/v1/productos", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/productos" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con lista de productos (Admin)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.producto.findMany.mockResolvedValue([productoMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/productos",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].codigo).toBe(1);
  });

  it("debería retornar 200 con lista de productos (Bodega)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);
    prisma.producto.findMany.mockResolvedValue([productoMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/productos",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("debería filtrar por descripcion via query string", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.producto.findMany.mockResolvedValue([productoMock]);

    await app.inject({
      method: "GET",
      url: "/api/v1/productos?descripcion=Cemento",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    const callWhere = prisma.producto.findMany.mock.calls[0][0].where;
    expect(callWhere.descripcion).toEqual({ contains: "Cemento", mode: "insensitive" });
  });

  it("debería filtrar por activo=true", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.producto.findMany.mockResolvedValue([productoMock]);

    await app.inject({
      method: "GET",
      url: "/api/v1/productos?activo=true",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    const callWhere = prisma.producto.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(true);
  });
});

// ── GET /api/v1/productos/:codigo ─────────────────────────────────────────────

describe("GET /api/v1/productos/:codigo", () => {
  it("debería retornar 200 con el producto encontrado", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/productos/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().codigo).toBe(1);
  });

  it("debería retornar 404 si el producto no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.producto.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/productos/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/no encontrado/i);
  });
});

// ── POST /api/v1/productos ────────────────────────────────────────────────────
// "codigo" NO se envía: es Int autoincrement generado por Prisma, y el schema
// de la ruta (additionalProperties:false) lo rechazaría si viniera en el body.

describe("POST /api/v1/productos", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/productos",
      payload: {
        descripcion: "Nuevo",
        precioCosto: 1000,
        precioVenta: 1500,
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 403 si el rol es Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/productos",
      headers: { authorization: `Bearer ${tokenBodega}` },
      payload: {
        descripcion: "Nuevo",
        precioCosto: 1000,
        precioVenta: 1500,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 404 si el proveedorId no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(null); // proveedor no existe

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/productos",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        descripcion: "Nuevo",
        precioCosto: 1000,
        precioVenta: 1500,
        proveedorId: 999,
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/proveedor/i);
  });

  it("debería retornar 201 al crear un producto correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.skuContador.upsert.mockResolvedValue({ prefijo: "NUE", ultimoNumero: 2 });
    prisma.producto.create.mockResolvedValue({
      ...productoMock,
      codigo: 2,
      sku: "NUE-002",
    });
    prisma.producto.findUnique.mockResolvedValue({
      ...productoMock,
      codigo: 2,
      sku: "NUE-002",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/productos",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        descripcion: "Nuevo",
        precioCosto: 1000,
        precioVenta: 1500,
        proveedorId: 1,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().codigo).toBe(2);
    expect(res.json().sku).toBe("NUE-002");
  });
});

// ── PATCH /api/v1/productos/:codigo ──────────────────────────────────────────

describe("PATCH /api/v1/productos/:codigo", () => {
  it("debería retornar 200 al editar correctamente (Admin)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.producto.update.mockResolvedValue({
      ...productoMock,
      precioVenta: 30000,
    });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/productos/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { precioVenta: 30000 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().precioVenta).toBe(30000);
  });

  it("debería retornar 200 al editar correctamente (Bodega)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.producto.update.mockResolvedValue({
      ...productoMock,
      precioVenta: 28000,
    });

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/productos/1",
      headers: { authorization: `Bearer ${tokenBodega}` },
      payload: { precioVenta: 28000 },
    });

    expect(res.statusCode).toBe(200);
  });

  it("debería retornar 404 si el producto no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.producto.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/productos/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { precioVenta: 30000 },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ── DELETE /api/v1/productos/:codigo ─────────────────────────────────────────

describe("DELETE /api/v1/productos/:codigo", () => {
  it("debería retornar 403 si el rol es Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/productos/1",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 200 al desactivar (Admin)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.producto.update.mockResolvedValue({
      ...productoMock,
      activo: false,
    });

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/productos/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().mensaje).toMatch(/desactivado/i);
  });

  it("debería retornar 404 si el producto no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.producto.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/productos/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
  });
});