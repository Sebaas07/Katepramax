/**
 * Tests de integración — rutas HTTP de Envio (guías de envío entre sedes)
 */
const { buildApp } = require("../src/app");
const { prisma } = require("./__mocks__/prisma");

// ── Datos de prueba ────────────────────────────────────────────────────────

const sedeBogotaMock = { id: 1, nombre: "Bogotá", activo: true };
const sedeCartagenaMock = { id: 2, nombre: "Cartagena", activo: true };
const sedeVillavoMock = { id: 3, nombre: "Villavicencio", activo: true };

const productoMock = {
  codigo: 1,
  descripcion: "Arroz Diana 500g",
  activo: true,
  precioCosto: 3000,
};

function envioBase(overrides = {}) {
  return {
    id: 1,
    sedeOrigenId: 1,
    sedeDestinoId: 2,
    creadoPorId: 1,
    confirmadoPorId: null,
    estado: "Pendiente",
    observaciones: null,
    observacionRecepcion: null,
    fechaEnvio: new Date(),
    fechaConfirmacion: null,
    sedeOrigen: { id: 1, nombre: "Bogotá" },
    sedeDestino: { id: 2, nombre: "Cartagena" },
    creador: { id: 1, nombreCompleto: "Admin Bogotá" },
    confirmador: null,
    detalles: [
      {
        id: 1,
        productoId: 1,
        cantidadEnviada: 5,
        cantidadRecibida: null,
        observacion: null,
        producto: { codigo: 1, descripcion: "Arroz Diana 500g", sku: "ARR-001" },
      },
    ],
    ...overrides,
  };
}

const sesionAdminMock = {
  id: 10,
  activa: true,
  expiraEn: new Date(Date.now() + 86400000),
  usuario: { id: 1, usuario: "admin", rol: "Admin", sedeId: 1, activo: true },
};
const sesionAdminBogotaMock = {
  ...sesionAdminMock,
  id: 11,
  usuario: { ...sesionAdminMock.usuario, id: 2, rol: "AdminBogota", sedeId: 1 },
};
const sesionBodegaCartagenaMock = {
  ...sesionAdminMock,
  id: 12,
  usuario: { ...sesionAdminMock.usuario, id: 3, rol: "Bodega", sedeId: 2 },
};
const sesionBodegaVillavoMock = {
  ...sesionAdminMock,
  id: 13,
  usuario: { ...sesionAdminMock.usuario, id: 4, rol: "Bodega", sedeId: 3 },
};
const sesionAdminCartagenaMock = {
  ...sesionAdminMock,
  id: 14,
  usuario: { ...sesionAdminMock.usuario, id: 5, rol: "Admin", sedeId: 2 },
};

// ── Setup ────────────────────────────────────────────────────────────────────

let app, tokenAdmin, tokenAdminBogota, tokenBodegaCartagena, tokenBodegaVillavo, tokenAdminCartagena;

beforeAll(async () => {
  app = await buildApp();
  app.prisma = prisma;
  await app.ready();

  tokenAdmin = app.jwt.sign({ sesionId: 10 });
  tokenAdminBogota = app.jwt.sign({ sesionId: 11 });
  tokenBodegaCartagena = app.jwt.sign({ sesionId: 12 });
  tokenBodegaVillavo = app.jwt.sign({ sesionId: 13 });
  tokenAdminCartagena = app.jwt.sign({ sesionId: 14 });
}, 30000);

afterAll(async () => {
  await app.close();
});

function authAdmin() {
  return { Authorization: `Bearer ${tokenAdmin}` };
}
function authAdminBogota() {
  return { Authorization: `Bearer ${tokenAdminBogota}` };
}
function authBodegaCartagena() {
  return { Authorization: `Bearer ${tokenBodegaCartagena}` };
}
function authBodegaVillavo() {
  return { Authorization: `Bearer ${tokenBodegaVillavo}` };
}
function authAdminCartagena() {
  return { Authorization: `Bearer ${tokenAdminCartagena}` };
}
function mockSesion(mock) {
  prisma.sesion.findFirst.mockResolvedValue(mock);
}

// ── POST /api/v1/envios ──────────────────────────────────────────────────────

describe("POST /api/v1/envios", () => {
  it("debería retornar 403 si el rol es Bodega", async () => {
    mockSesion(sesionBodegaCartagenaMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/envios",
      headers: authBodegaCartagena(),
      payload: { sedesDestinoIds: [2], detalles: [{ productoId: 1, cantidad: 5 }] },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 400 si no se selecciona ninguna sede destino", async () => {
    mockSesion(sesionAdminBogotaMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/envios",
      headers: authAdminBogota(),
      payload: { sedesDestinoIds: [], detalles: [{ productoId: 1, cantidad: 5 }] },
    });

    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 400 si una sede destino es igual a la sede origen", async () => {
    mockSesion(sesionAdminBogotaMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/envios",
      headers: authAdminBogota(),
      payload: { sedesDestinoIds: [1], detalles: [{ productoId: 1, cantidad: 5 }] },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/destino/i);
  });

  it("debería retornar 422 si no hay stock suficiente en la sede origen", async () => {
    mockSesion(sesionAdminBogotaMock);
    prisma.sede.findUnique.mockResolvedValue(sedeBogotaMock);
    prisma.sede.findMany.mockResolvedValue([sedeCartagenaMock, sedeVillavoMock]);
    prisma.producto.findMany.mockResolvedValue([productoMock]);
    prisma.stockSede.findMany.mockResolvedValue([{ productoId: 1, stockActual: 5 }]);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/envios",
      headers: authAdminBogota(),
      // 2 destinos x 5 unidades = 10 requeridas, solo hay 5 disponibles
      payload: {
        sedesDestinoIds: [2, 3],
        detalles: [{ productoId: 1, cantidad: 5 }],
      },
    });

    expect(res.statusCode).toBe(422);
    expect(res.json().error).toMatch(/stock insuficiente/i);
  });

  it("debería retornar 201 y crear un envío por cada sede destino, descontando el total de la sede origen", async () => {
    mockSesion(sesionAdminBogotaMock);
    prisma.sede.findUnique.mockResolvedValue(sedeBogotaMock);
    prisma.sede.findMany.mockResolvedValue([sedeCartagenaMock, sedeVillavoMock]);
    prisma.producto.findMany.mockResolvedValue([productoMock]);
    prisma.stockSede.findMany.mockResolvedValue([{ productoId: 1, stockActual: 100 }]);
    prisma.envio.create
      .mockResolvedValueOnce(envioBase({ id: 1, sedeDestinoId: 2, sedeDestino: { id: 2, nombre: "Cartagena" } }))
      .mockResolvedValueOnce(envioBase({ id: 2, sedeDestinoId: 3, sedeDestino: { id: 3, nombre: "Villavicencio" } }));

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/envios",
      headers: authAdminBogota(),
      payload: {
        sedesDestinoIds: [2, 3],
        detalles: [{ productoId: 1, cantidad: 5 }],
        observaciones: "Reposición mensual",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body).toHaveLength(2);
    expect(body[0].sedeDestinoId).toBe(2);
    expect(body[1].sedeDestinoId).toBe(3);

    // El stock de origen se descuenta UNA vez por producto con el total (5 * 2 destinos = 10)
    expect(prisma.stockSede.update).toHaveBeenCalledWith({
      where: { sedeId_productoId: { sedeId: 1, productoId: 1 } },
      data: { stockActual: { decrement: 10 } },
    });

    // Se registra la salida en Inventario por el total
    expect(prisma.inventario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sedeId: 1,
          productoId: 1,
          cantidadIngresada: -10,
          tipo: "salida",
        }),
      }),
    );

    // Se crea un Envio por cada sede destino, con la cantidad enviada completa
    expect(prisma.envio.create).toHaveBeenCalledTimes(2);
  });

  it("un Admin debería poder indicar explícitamente la sede origen", async () => {
    mockSesion(sesionAdminMock);
    prisma.sede.findUnique.mockResolvedValue(sedeBogotaMock);
    prisma.sede.findMany.mockResolvedValue([sedeCartagenaMock]);
    prisma.producto.findMany.mockResolvedValue([productoMock]);
    prisma.stockSede.findMany.mockResolvedValue([{ productoId: 1, stockActual: 50 }]);
    prisma.envio.create.mockResolvedValue(envioBase());

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/envios",
      headers: authAdmin(),
      payload: {
        sedeOrigenId: 1,
        sedesDestinoIds: [2],
        detalles: [{ productoId: 1, cantidad: 5 }],
      },
    });

    expect(res.statusCode).toBe(201);
  });
});

// ── GET /api/v1/envios ───────────────────────────────────────────────────────

describe("GET /api/v1/envios", () => {
  it("debería filtrar por sede destino cuando direccion=recibidos y el rol no es Admin", async () => {
    mockSesion(sesionBodegaCartagenaMock);
    prisma.envio.findMany.mockResolvedValue([envioBase()]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/envios?direccion=recibidos",
      headers: authBodegaCartagena(),
    });

    expect(res.statusCode).toBe(200);
    expect(prisma.envio.findMany.mock.calls[0][0].where.sedeDestinoId).toBe(2);
  });

  it("debería ver ambas direcciones si no se especifica y el rol no es Admin", async () => {
    mockSesion(sesionBodegaCartagenaMock);
    prisma.envio.findMany.mockResolvedValue([]);

    await app.inject({
      method: "GET",
      url: "/api/v1/envios",
      headers: authBodegaCartagena(),
    });

    expect(prisma.envio.findMany.mock.calls[0][0].where.OR).toEqual([
      { sedeOrigenId: 2 },
      { sedeDestinoId: 2 },
    ]);
  });
});

// ── GET /api/v1/envios/pendientes-count ─────────────────────────────────────

describe("GET /api/v1/envios/pendientes-count", () => {
  it("debería contar solo los pendientes de mi sede destino", async () => {
    mockSesion(sesionBodegaCartagenaMock);
    prisma.envio.count.mockResolvedValue(2);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/envios/pendientes-count",
      headers: authBodegaCartagena(),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ pendientes: 2 });
    expect(prisma.envio.count).toHaveBeenCalledWith({
      where: { estado: "Pendiente", sedeDestinoId: 2 },
    });
  });
});

// ── PATCH /api/v1/envios/:id/confirmar ──────────────────────────────────────

describe("PATCH /api/v1/envios/:id/confirmar", () => {
  it("debería retornar 403 si otra sede intenta confirmar", async () => {
    mockSesion(sesionBodegaVillavoMock);
    prisma.envio.findUnique.mockResolvedValue(envioBase());

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/confirmar",
      headers: authBodegaVillavo(),
      payload: { detalles: [{ envioDetalleId: 1, cantidadRecibida: 5 }] },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 409 si el envío ya fue confirmado", async () => {
    mockSesion(sesionBodegaCartagenaMock);
    prisma.envio.findUnique.mockResolvedValue(envioBase({ estado: "Confirmado" }));

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/confirmar",
      headers: authBodegaCartagena(),
      payload: { detalles: [{ envioDetalleId: 1, cantidadRecibida: 5 }] },
    });

    expect(res.statusCode).toBe(409);
  });

  it("debería retornar 400 si falta la observación cuando hay faltante", async () => {
    mockSesion(sesionBodegaCartagenaMock);
    prisma.envio.findUnique.mockResolvedValue(envioBase());

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/confirmar",
      headers: authBodegaCartagena(),
      payload: { detalles: [{ envioDetalleId: 1, cantidadRecibida: 3 }] }, // faltan 2, sin observación
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/observaci/i);
  });

  it("debería retornar 200 y marcar Confirmado cuando todo llega completo", async () => {
    mockSesion(sesionBodegaCartagenaMock);
    prisma.envio.findUnique
      .mockResolvedValueOnce(envioBase())
      .mockResolvedValueOnce(envioBase({ estado: "Confirmado", detalles: [{ ...envioBase().detalles[0], cantidadRecibida: 5 }] }));
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/confirmar",
      headers: authBodegaCartagena(),
      payload: { detalles: [{ envioDetalleId: 1, cantidadRecibida: 5 }] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().estado).toBe("Confirmado");

    // Entra al inventario de la sede destino
    expect(prisma.inventario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sedeId: 2,
          productoId: 1,
          cantidadIngresada: 5,
          tipo: "entrada",
        }),
      }),
    );
    // Se crea/actualiza el stock de esa sede (upsert cubre el caso "no existía")
    expect(prisma.stockSede.upsert).toHaveBeenCalledWith({
      where: { sedeId_productoId: { sedeId: 2, productoId: 1 } },
      update: { stockActual: { increment: 5 } },
      create: { sedeId: 2, productoId: 1, stockActual: 5 },
    });
  });

  it("debería retornar 200 y marcar ConNovedad con observación cuando falta mercancía", async () => {
    mockSesion(sesionBodegaCartagenaMock);
    prisma.envio.findUnique
      .mockResolvedValueOnce(envioBase())
      .mockResolvedValueOnce(
        envioBase({
          estado: "ConNovedad",
          detalles: [{ ...envioBase().detalles[0], cantidadRecibida: 3, observacion: "2 unidades llegaron dañadas" }],
        }),
      );
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/confirmar",
      headers: authBodegaCartagena(),
      payload: {
        detalles: [
          { envioDetalleId: 1, cantidadRecibida: 3, observacion: "2 unidades llegaron dañadas" },
        ],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().estado).toBe("ConNovedad");
    expect(prisma.envioDetalle.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { cantidadRecibida: 3, observacion: "2 unidades llegaron dañadas" },
    });
    // Solo las 3 unidades buenas entran al inventario
    expect(prisma.inventario.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ cantidadIngresada: 3 }) }),
    );
  });

  it("debería retornar 400 si la cantidad recibida es mayor a la enviada", async () => {
    mockSesion(sesionBodegaCartagenaMock);
    prisma.envio.findUnique.mockResolvedValue(envioBase());

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/confirmar",
      headers: authBodegaCartagena(),
      payload: { detalles: [{ envioDetalleId: 1, cantidadRecibida: 99 }] },
    });

    expect(res.statusCode).toBe(400);
  });

  it("un Admin de la sede origen NO debería poder confirmar (la sede que envió no confirma)", async () => {
    mockSesion(sesionAdminMock);
    prisma.envio.findUnique.mockResolvedValue(envioBase());

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/confirmar",
      headers: authAdmin(),
      payload: { detalles: [{ envioDetalleId: 1, cantidadRecibida: 5 }] },
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/destino/i);
  });

  it("un Admin de la sede destino sí debería poder confirmar", async () => {
    mockSesion(sesionAdminCartagenaMock);
    prisma.envio.findUnique
      .mockResolvedValueOnce(envioBase())
      .mockResolvedValueOnce(envioBase({ estado: "Confirmado" }));
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/confirmar",
      headers: authAdminCartagena(),
      payload: { detalles: [{ envioDetalleId: 1, cantidadRecibida: 5 }] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().estado).toBe("Confirmado");
  });
});

// ── PATCH /api/v1/envios/:id/cancelar ───────────────────────────────────────

describe("PATCH /api/v1/envios/:id/cancelar", () => {
  it("debería retornar 403 si la sede destino intenta cancelar", async () => {
    mockSesion(sesionBodegaCartagenaMock);
    prisma.envio.findUnique.mockResolvedValue(envioBase());

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/cancelar",
      headers: authBodegaCartagena(),
    });

    expect(res.statusCode).toBe(403);
    expect(res.json().error).toMatch(/origin/i);
  });

  it("debería retornar 403 si un Admin no pertenece a la sede origen", async () => {
    mockSesion(sesionAdminCartagenaMock);
    prisma.envio.findUnique.mockResolvedValue(envioBase());

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/cancelar",
      headers: authAdminCartagena(),
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 409 si el envío ya no está pendiente", async () => {
    mockSesion(sesionAdminBogotaMock);
    prisma.envio.findUnique.mockResolvedValue(envioBase({ estado: "Confirmado" }));

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/cancelar",
      headers: authAdminBogota(),
    });

    expect(res.statusCode).toBe(409);
  });

  it("debería retornar 200 cuando la sede origen cancela, devolviendo el stock", async () => {
    mockSesion(sesionAdminBogotaMock);
    prisma.envio.findUnique
      .mockResolvedValueOnce(envioBase())
      .mockResolvedValueOnce(envioBase({ estado: "Cancelado" }));
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/envios/1/cancelar",
      headers: authAdminBogota(),
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().estado).toBe("Cancelado");

    // El stock se devuelve a la sede origen (5 unidades)
    expect(prisma.stockSede.upsert).toHaveBeenCalledWith({
      where: { sedeId_productoId: { sedeId: 1, productoId: 1 } },
      update: { stockActual: { increment: 5 } },
      create: { sedeId: 1, productoId: 1, stockActual: 5 },
    });

    // Se registra la reversión en Inventario como entrada
    expect(prisma.inventario.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sedeId: 1,
          productoId: 1,
          cantidadIngresada: 5,
          tipo: "entrada",
        }),
      }),
    );
  });
});
