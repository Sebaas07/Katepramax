/**
 * Tests de integración — rutas HTTP de Inventario
 *
 * Rutas cubiertas:
 *  POST   /api/v1/inventario                  (Admin y Bodega)
 *  GET    /api/v1/inventario                  (Admin y Bodega)
 *  GET    /api/v1/inventario/resumen-semanal  (Admin y Bodega)
 *  GET    /api/v1/inventario/:id              (Admin y Bodega)
 *  PATCH  /api/v1/inventario/:id              (Admin y Bodega)
 *  DELETE /api/v1/inventario/:id              (solo Admin)
 */
const { buildApp } = require("../src/app");
const { prisma } = require("./__mocks__/prisma");

// ── Datos de prueba ───────────────────────────────────────────────────────────

const sedeMock = { id: 1, nombre: "Sede Principal" };
const productoMock = {
  codigo: 1,
  descripcion: "Cemento Gris 50kg",
  precioCosto: 18000,
  activo: true,
};

const inventarioMock = {
  id: 1,
  fecha: new Date("2026-06-02"),
  semana: 23,
  sedeId: 1,
  productoId: 1,
  cantidadIngresada: 10,
  costoUnitario: 180000,
  sede: { id: 1, nombre: "Sede Principal" },
  producto: {
    codigo: 1,
    descripcion: "Cemento Gris 50kg",
    precioCosto: 18000,
  },
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
  app = await buildApp();
  app.prisma = prisma;
  await app.ready();

  tokenAdmin = app.jwt.sign({ sesionId: 10 }, { expiresIn: "15m" });
  tokenBodega = app.jwt.sign({ sesionId: 11 }, { expiresIn: "15m" });
});

afterAll(async () => {
  await app.close();
});

// ── POST /api/v1/inventario ───────────────────────────────────────────────────

describe("POST /api/v1/inventario", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/inventario",
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 404 si la sede no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/inventario",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        sedeId: 999,
        productoId: 1,
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/sede/i);
  });

  it("debería retornar 404 si el producto no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/inventario",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        sedeId: 1,
        productoId: 999,
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
      },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/producto/i);
  });

  it("debería retornar 422 si el producto está inactivo", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue({
      ...productoMock,
      activo: false,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/inventario",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
      },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch(/inactivo/i);
  });

  it("debería retornar 201 al registrar correctamente (Admin)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.create.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/inventario",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().productoId).toBe(1);
    expect(res.json().cantidadIngresada).toBe(10);
  });

  it("debería retornar 201 al registrar correctamente (Bodega)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.create.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/inventario",
      headers: { authorization: `Bearer ${tokenBodega}` },
      payload: {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 5,
        fecha: "2026-06-02",
        semana: 23,
      },
    });

    expect(res.statusCode).toBe(201);
  });

  it("debería aceptar cantidadIngresada negativa cuando tipo es ajuste y descontar del stock", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.create.mockResolvedValue({ ...inventarioMock, cantidadIngresada: -10, tipo: "ajuste" });
    prisma.stockSede.upsert.mockResolvedValue({});

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/inventario",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: -10,
        tipo: "ajuste",
        fecha: "2026-06-02",
        semana: 23,
      },
    });

    expect(res.statusCode).toBe(201);
    // El schema ya no debe rechazar el número negativo (antes tenía minimum: 0)
    expect(prisma.inventario.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cantidadIngresada: -10 }) }),
    );
    expect(prisma.stockSede.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { stockActual: { increment: -10 } },
      }),
    );
  });

  it("debería retornar 400 si el ajuste es 0", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/inventario",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 0,
        tipo: "ajuste",
        fecha: "2026-06-02",
        semana: 23,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/sumar|restar/i);
  });

  it("debería retornar 400 si entrada/salida viene con cantidad <= 0", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/inventario",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: -5,
        tipo: "entrada",
        fecha: "2026-06-02",
        semana: 23,
      },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── GET /api/v1/inventario ────────────────────────────────────────────────────

describe("GET /api/v1/inventario", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/inventario" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con lista de registros", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.findMany.mockResolvedValue([inventarioMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/inventario",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("debería filtrar por semana", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.findMany.mockResolvedValue([inventarioMock]);

    await app.inject({
      method: "GET",
      url: "/api/v1/inventario?semana=23",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.semana).toBe(23);
  });

  it("debería filtrar por sedeId", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.findMany.mockResolvedValue([inventarioMock]);

    await app.inject({
      method: "GET",
      url: "/api/v1/inventario?sedeId=1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.sedeId).toBe(1);
  });

  it("debería filtrar por tipo (entrada, salida o ajuste)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.findMany.mockResolvedValue([inventarioMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/inventario?tipo=salida",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.tipo).toBe("salida");
  });

  it("debería retornar 400 si tipo no es entrada, salida o ajuste", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/inventario?tipo=invalido",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── GET /api/v1/inventario/resumen-semanal ────────────────────────────────────

describe("GET /api/v1/inventario/resumen-semanal", () => {
  it("debería retornar 200 con el resumen de la semana", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.groupBy.mockResolvedValue([
      {
        sedeId: 1,
        productoId: 1,
        _sum: { cantidadIngresada: 15, costoUnitario: 270000 },
        _max: { fecha: new Date("2026-06-06") },
      },
    ]);
    prisma.sede.findMany.mockResolvedValue([sedeMock]);
    prisma.producto.findMany.mockResolvedValue([
      { codigo: 1, descripcion: "Cemento Gris 50kg" },
    ]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/inventario/resumen-semanal?semana=23",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body[0].sede).toBe("Sede Principal");
    expect(body[0].producto).toBe("Cemento Gris 50kg");
    expect(body[0].cantidad).toBe(15);
  });
});

// ── GET /api/v1/inventario/:id ────────────────────────────────────────────────

describe("GET /api/v1/inventario/:id", () => {
  it("debería retornar 200 con el registro encontrado", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/inventario/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(1);
  });

  it("debería retornar 404 si el registro no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/inventario/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
  });
});

// ── PATCH /api/v1/inventario/:id ──────────────────────────────────────────────

describe("PATCH /api/v1/inventario/:id", () => {
  it("debería retornar 404 si el registro no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/inventario/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { cantidadIngresada: 15 },
    });

    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 y actualizar el stock con el delta correcto", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock); // cantidadIngresada: 10
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      cantidadIngresada: 15,
    });
    prisma.stockSede.upsert.mockResolvedValue({});

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/inventario/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { cantidadIngresada: 15 },
    });

    expect(res.statusCode).toBe(200);
    // delta = 15 - 10 = 5 → stockSede debe incrementarse en 5
    expect(prisma.stockSede.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { stockActual: { increment: 5 } },
      }),
    );
  });
});

// ── DELETE /api/v1/inventario/:id ─────────────────────────────────────────────

describe("DELETE /api/v1/inventario/:id", () => {
  it("debería retornar 403 si el rol es Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/inventario/1",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 404 si el registro no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/inventario/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200, eliminar el registro y revertir el stock", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock); // cantidadIngresada: 10
    prisma.inventario.delete.mockResolvedValue(inventarioMock);
    prisma.stockSede.findUnique.mockResolvedValue({
      sedeId: 1,
      productoId: 1,
      stockActual: 100,
    });
    prisma.stockSede.update.mockResolvedValue({});

    const res = await app.inject({
      method: "DELETE",
      url: "/api/v1/inventario/1",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().mensaje).toMatch(/eliminado/i);
    // El stock debe decrementarse en la cantidad que tenía el registro
    expect(prisma.stockSede.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { stockActual: { decrement: 10 } },
      }),
    );
  });
});
