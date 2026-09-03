/**
 * Tests unitarios — cartera.service.js
 */
const { prisma } = require("./__mocks__/prisma");
const carteraSvc = require("../src/services/cartera.service");

const appMock = { prisma };
const sedeMock = { id: 1, nombre: "Bogotá" };
const usuarioAdmin = { id: 1, rol: "Admin", sedeId: 1 };

const carteraMock = {
  id: 1,
  fecha: new Date("2026-05-05"),
  semana: 18,
  sedeId: 1,
  saldoDia: 500000,
  saldoAnterior: 400000,
  variacion: 100000,
  sede: { id: 1, nombre: "Bogotá" },
};

describe("carteraService.registrar", () => {
  const body = {
    fecha: "2026-05-05",
    semana: 18,
    sedeId: 1,
    saldoDia: 500000,
  };

  beforeEach(() => {
    // Por defecto ningún saldo anterior
    prisma.cartera.findFirst.mockResolvedValue(null);
  });

  it("debería lanzar AppError 404 si la sede no existe", async () => {
    prisma.sede.findUnique.mockResolvedValue(null);

    await expect(
      carteraSvc.registrar(appMock, body, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería calcular saldoAnterior=0 y variacion=saldoDia cuando no hay registro previo", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.cartera.findFirst.mockResolvedValue(null);
    prisma.cartera.create.mockResolvedValue(carteraMock);

    await carteraSvc.registrar(appMock, body, usuarioAdmin);

    const data = prisma.cartera.create.mock.calls[0][0].data;
    expect(data.saldoAnterior).toBe(0);
    expect(data.variacion).toBe(500000);
    expect(data.saldoDia).toBe(500000);
  });

  it("debería calcular variacion respecto al saldo anterior", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.cartera.findFirst.mockResolvedValue({ saldoDia: 400000 });
    prisma.cartera.create.mockResolvedValue(carteraMock);

    await carteraSvc.registrar(appMock, body, usuarioAdmin);

    const data = prisma.cartera.create.mock.calls[0][0].data;
    expect(data.saldoAnterior).toBe(400000);
    expect(data.variacion).toBe(100000);
  });

  it("debería lanzar AppError 409 si ya existe un saldo para la sede y fecha", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.cartera.findFirst.mockResolvedValue(null);
    prisma.cartera.create.mockRejectedValue({ code: "P2002" });

    await expect(
      carteraSvc.registrar(appMock, body, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("debería rechazar un saldo menor o igual a cero", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);

    await expect(
      carteraSvc.registrar(appMock, { ...body, saldoDia: 0 }, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 422 });
  });
});

describe("carteraService.obtenerPorId", () => {
  it("debería retornar el registro si existe", async () => {
    prisma.cartera.findUnique.mockResolvedValue(carteraMock);

    const result = await carteraSvc.obtenerPorId(appMock, 1, usuarioAdmin);

    expect(result.id).toBe(1);
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.cartera.findUnique.mockResolvedValue(null);

    await expect(
      carteraSvc.obtenerPorId(appMock, 999, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería denegar a un Bodega ver cartera de otra sede", async () => {
    const usuarioBodega = { id: 2, rol: "Bodega", sedeId: 2 };
    prisma.cartera.findUnique.mockResolvedValue({ ...carteraMock, sedeId: 1 });

    await expect(
      carteraSvc.obtenerPorId(appMock, 1, usuarioBodega),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("carteraService.editar", () => {
  beforeEach(() => {
    prisma.cartera.findUnique.mockResolvedValue(carteraMock);
  });

  it("debería recalcular saldoAnterior y variacion al editar saldo", async () => {
    prisma.cartera.findFirst.mockResolvedValue({ saldoDia: 300000 });
    prisma.cartera.update.mockResolvedValue({ ...carteraMock, saldoDia: 450000 });

    await carteraSvc.editar(appMock, 1, { saldoDia: 450000 }, usuarioAdmin);

    const data = prisma.cartera.update.mock.calls[0][0].data;
    expect(data.saldoAnterior).toBe(300000);
    expect(data.variacion).toBe(150000);
    expect(data.saldoDia).toBe(450000);
  });

  it("debería lanzar AppError 409 si el cambio colisiona con un saldo existente", async () => {
    prisma.cartera.findFirst.mockResolvedValue(null);
    prisma.cartera.update.mockRejectedValue({ code: "P2002" });

    await expect(
      carteraSvc.editar(appMock, 1, { saldoDia: 450000 }, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("debería lanzar AppError 404 si el registro no existe", async () => {
    prisma.cartera.findUnique.mockResolvedValue(null);

    await expect(
      carteraSvc.editar(appMock, 999, { saldoDia: 100 }, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("carteraService.borrar", () => {
  it("debería eliminar el registro si existe", async () => {
    prisma.cartera.findUnique.mockResolvedValue(carteraMock);
    prisma.cartera.delete.mockResolvedValue(carteraMock);

    await carteraSvc.borrar(appMock, 1, usuarioAdmin);

    expect(prisma.cartera.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.cartera.findUnique.mockResolvedValue(null);

    await expect(
      carteraSvc.borrar(appMock, 999, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});
