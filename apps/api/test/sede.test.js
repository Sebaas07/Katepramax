/**
 * Tests de integración — GET /api/v1/sedes
 */
const { buildApp } = require("../src/app");
const { prisma }   = require("./__mocks__/prisma");

const sedeMock = { id: 1, nombre: "Sede Principal", activo: true };

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

let app, tokenAdmin, tokenBodega;

beforeAll(async () => {
  app = await buildApp();
  app.prisma = prisma;
  await app.ready();
  tokenAdmin  = app.jwt.sign({ sesionId: 10 });
  tokenBodega = app.jwt.sign({ sesionId: 11 });
});

afterAll(() => app.close());

describe("GET /api/v1/sedes", () => {
  it("devuelve lista de sedes activas para Admin", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findMany.mockResolvedValue([sedeMock]);

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/sedes",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body[0].nombre).toBe("Sede Principal");
  });

  it("devuelve lista para Bodega también", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);
    prisma.sede.findMany.mockResolvedValue([sedeMock]);

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/sedes",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(200);
  });

  it("devuelve 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/sedes" });
    expect(res.statusCode).toBe(401);
  });

  it("filtra por activo=false si se pasa el query param", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findMany.mockResolvedValue([]);

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/sedes?activo=false",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(prisma.sede.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activo: false } }),
    );
  });

  it("por defecto solo trae sedes ACTIVAS (no envía filtro de inactivas)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findMany.mockResolvedValue([sedeMock]);

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/sedes",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(prisma.sede.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { activo: true } }),
    );
  });

  it("con activo=todas trae TODAS las sedes (sin filtro)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.sede.findMany.mockResolvedValue([sedeMock]);

    const res = await app.inject({
      method:  "GET",
      url:     "/api/v1/sedes?activo=todas",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(prisma.sede.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});
