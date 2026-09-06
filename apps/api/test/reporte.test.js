/**
 * Tests de integración — rutas HTTP de Reporte
 *
 * Rutas cubiertas:
 *  GET /api/v1/reportes/arqueo-semanal    (Admin, AdminBogota y Oficinista)
 *  GET /api/v1/reportes/panel-general     (Admin, AdminBogota, Bodega y Oficinista)
 *
 * Reglas de negocio cubiertas:
 *  - Arqueo agrega ingresos + egresos + abonos + saldo neto por sede (solo oficinas)
 *  - Panel General es snapshot de un día (ingresos, egresos, cartera, stock)
 */
const { buildApp } = require("../src/app");
const { prisma } = require("./__mocks__/prisma");

// ── Mocks base ────────────────────────────────────────────────────────────────

const sedes = [
  { id: 1, nombre: "Bogotá", tipo: "Oficina", activo: true },
  { id: 2, nombre: "Villavicencio", tipo: "Oficina", activo: true },
];

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

  tokenAdmin = app.jwt.sign({ sesionId: 10 });
  tokenBodega = app.jwt.sign({ sesionId: 11 });
});

afterAll(async () => {
  await app.close();
});

function authAdmin() {
  return { Authorization: `Bearer ${tokenAdmin}` };
}
function authBodega() {
  return { Authorization: `Bearer ${tokenBodega}` };
}
function mockSesion(mock) {
  prisma.sesion.findFirst.mockResolvedValue(mock);
}

/** Configura todos los groupBy que arqueoSemanal necesita */
function mockArqueo() {
  prisma.sede.findMany.mockResolvedValue(sedes);
  prisma.ingreso = {
    groupBy: vi.fn().mockResolvedValue([
      {
        sedeId: 1,
        _sum: { efectivo: 300000, cuentas: 100000, total: 400000 },
      },
    ]),
  };
  // arqueoSemanal llama a prisma.egreso.groupBy dos veces: una para el total
  // de egresos y otra (origen "abono-proveedor") para el desglose de pagos a
  // proveedores. Los abonos a proveedores ahora viven como Egresos.
  prisma.egreso = {
    groupBy: vi.fn().mockImplementation(({ where }) =>
      where?.origen === "abono-proveedor"
        ? Promise.resolve([{ sedeId: 1, _sum: { total: 20000 } }])
        : Promise.resolve([{ sedeId: 1, _sum: { total: 70000 } }]),
    ),
  };
  prisma.abono = {
    groupBy: vi
      .fn()
      .mockResolvedValue([{ sedeId: 1, _sum: { valorPagado: 20000 } }]),
  };
  prisma.inventario = {
    groupBy: vi
      .fn()
      .mockResolvedValue([{ semana: 18, _sum: { costoUnitario: 150000 } }]),
    aggregate: vi.fn().mockResolvedValue({ _sum: { costoUnitario: 150000 } }),
    findMany: vi.fn().mockResolvedValue([
      { cantidadIngresada: 2, costoUnitario: 75000 },
    ]),
  };
  prisma.cliente = {
    ...prisma.cliente,
    aggregate: vi.fn().mockResolvedValue({ _sum: { saldoDeuda: 500000 } }),
  };
}

// ── GET /api/v1/reportes/arqueo-semanal ───────────────────────────────────────

describe("GET /api/v1/reportes/arqueo-semanal", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reportes/arqueo-semanal?semana=18",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 403 si el rol es Bodega", async () => {
    mockSesion(sesionBodegaMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reportes/arqueo-semanal?semana=18",
      headers: authBodega(),
    });
    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 400 si falta el parámetro semana", async () => {
    mockSesion(sesionAdminMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reportes/arqueo-semanal",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 200 con el arqueo completo", async () => {
    mockSesion(sesionAdminMock);
    mockArqueo();

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reportes/arqueo-semanal?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.semana).toBe(18);
    // El response schema declara ingresos.porSede como array con campos tipados
    expect(body.ingresos.porSede[0].total).toBe(400000);
    expect(body.cartera).toBe(500000);
    expect(body.costoInventario).toBe(150000);
  });

  it("debería retornar saldo neto correcto (ingresos - egresos)", async () => {
    mockSesion(sesionAdminMock);
    mockArqueo();

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reportes/arqueo-semanal?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // Sede 1: ingresos=400000, egresos=50000+20000=70000, saldo=330000
    expect(body.saldoNeto.total).toBe(330000);
  });

  it("debería incluir todas las sedes aunque no tengan datos", async () => {
    mockSesion(sesionAdminMock);
    mockArqueo();
    // groupBy devuelve solo sede 1; sede 2 debe aparecer con ceros
    prisma.ingreso = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.egreso = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.abono = { groupBy: vi.fn().mockResolvedValue([]) };

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reportes/arqueo-semanal?semana=18",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ingresos.porSede).toHaveLength(2);
    expect(body.ingresos.porSede.find((s) => s.sedeId === 2).total).toBe(0);
  });
});

// ── GET /api/v1/reportes/panel-general ────────────────────────────────────────

describe("GET /api/v1/reportes/panel-general", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reportes/panel-general?fecha=2026-05-05",
    });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 400 si falta la fecha", async () => {
    mockSesion(sesionAdminMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reportes/panel-general",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 200 para Admin", async () => {
    mockSesion(sesionAdminMock);
    prisma.sede.findMany.mockResolvedValue(sedes);
    prisma.ingreso = {
      groupBy: vi.fn().mockResolvedValue([
        {
          sedeId: 1,
          _sum: { efectivo: 200000, cuentas: 50000, total: 250000 },
        },
      ]),
    };
    prisma.egreso = {
      groupBy: vi
        .fn()
        .mockResolvedValue([{ sedeId: 1, _sum: { total: 30000 } }]),
    };
    prisma.cliente = {
      ...prisma.cliente,
      aggregate: vi.fn().mockResolvedValue({ _sum: { saldoDeuda: 800000 } }),
    };
    prisma.stockSede = {
      ...prisma.stockSede,
      aggregate: vi.fn().mockResolvedValue({ _sum: { stockActual: 500 } }),
      findMany:  vi.fn().mockResolvedValue([]),
    };
    prisma.pedido = {
      ...prisma.pedido,
      count: vi.fn().mockResolvedValue(0),
    };
    prisma.asignacionEntrega = {
      ...prisma.asignacionEntrega,
      count: vi.fn().mockResolvedValue(0),
    };

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reportes/panel-general?fecha=2026-05-05",
      headers: authAdmin(),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.fecha).toBe("2026-05-05");
    // El response schema declara ingresos/egresos como { type: "object" } sin propiedades,
    // Fastify los serializa como {} — verificamos los campos con tipos declarados
    expect(body.cartera).toBe(800000);
    expect(typeof body.totalStockUnidades).toBe("number");
    expect(body.pedidosPendientes).toBe(0);
    expect(body.entregasEnRuta).toBe(0);
    expect(body.alertasInventario).toBe(0);
  });

  it("debería retornar 200 para Bodega", async () => {
    mockSesion(sesionBodegaMock);
    prisma.sede.findMany.mockResolvedValue(sedes);
    prisma.ingreso = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.egreso = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.cliente = {
      ...prisma.cliente,
      aggregate: vi.fn().mockResolvedValue({ _sum: { saldoDeuda: 0 } }),
    };
    prisma.stockSede = {
      ...prisma.stockSede,
      aggregate: vi.fn().mockResolvedValue({ _sum: { stockActual: 0 } }),
      findMany:  vi.fn().mockResolvedValue([]),
    };
    prisma.pedido = {
      ...prisma.pedido,
      count: vi.fn().mockResolvedValue(0),
    };
    prisma.asignacionEntrega = {
      ...prisma.asignacionEntrega,
      count: vi.fn().mockResolvedValue(0),
    };

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/reportes/panel-general?fecha=2026-05-05",
      headers: authBodega(),
    });
    expect(res.statusCode).toBe(200);
  });
});
