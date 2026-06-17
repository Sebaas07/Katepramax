/**
 * Tests unitarios — ingreso.repository.js
 */
const { prisma } = require("../__mocks__/prisma");
const repo       = require("../../src/repositories/ingreso.repository");

const INCLUDE = { sede: { select: { id: true, nombre: true } } };

const ingresoMock = {
  id: 1, fecha: new Date("2026-05-05"), semana: 18,
  sedeId: 1, efectivo: 300000, cuentas: 150000, total: 450000, observacion: null,
};

// ── crear ─────────────────────────────────────────────────────────────────────

describe("ingresoRepository.crear", () => {
  it("debería llamar prisma.ingreso.create con data e INCLUDE", async () => {
    prisma.ingreso.create.mockResolvedValue(ingresoMock);
    const data = { fecha: new Date("2026-05-05"), semana: 18, sedeId: 1, efectivo: 300000, cuentas: 150000, total: 450000 };

    await repo.crear(prisma, data);

    expect(prisma.ingreso.create).toHaveBeenCalledWith({ data, include: INCLUDE });
  });
});

// ── listar ────────────────────────────────────────────────────────────────────

describe("ingresoRepository.listar", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.ingreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma);

    expect(prisma.ingreso.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería filtrar por semana si se pasa", async () => {
    prisma.ingreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { semana: 18 });

    const where = prisma.ingreso.findMany.mock.calls[0][0].where;
    expect(where.semana).toBe(18);
  });

  it("debería filtrar por sedeId si se pasa", async () => {
    prisma.ingreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { sedeId: 1 });

    const where = prisma.ingreso.findMany.mock.calls[0][0].where;
    expect(where.sedeId).toBe(1);
  });

  it("debería filtrar por fecha si se pasa", async () => {
    prisma.ingreso.findMany.mockResolvedValue([]);
    const fecha = new Date("2026-05-05");

    await repo.listar(prisma, { fecha });

    const where = prisma.ingreso.findMany.mock.calls[0][0].where;
    expect(where.fecha).toEqual(fecha);
  });

  it("debería ordenar por fecha desc y sedeId asc", async () => {
    prisma.ingreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma);

    expect(prisma.ingreso.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ fecha: "desc" }, { sedeId: "asc" }] }),
    );
  });

  it("no debería incluir keys undefined en where", async () => {
    prisma.ingreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma, {});

    const where = prisma.ingreso.findMany.mock.calls[0][0].where;
    expect(where.semana).toBeUndefined();
    expect(where.sedeId).toBeUndefined();
    expect(where.fecha).toBeUndefined();
  });
});

// ── buscarPorId ───────────────────────────────────────────────────────────────

describe("ingresoRepository.buscarPorId", () => {
  it("debería buscar por id único con INCLUDE", async () => {
    prisma.ingreso.findUnique.mockResolvedValue(ingresoMock);

    const result = await repo.buscarPorId(prisma, 1);

    expect(prisma.ingreso.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: INCLUDE });
    expect(result.id).toBe(1);
  });

  it("debería retornar null si no existe", async () => {
    prisma.ingreso.findUnique.mockResolvedValue(null);

    const result = await repo.buscarPorId(prisma, 999);

    expect(result).toBeNull();
  });
});

// ── actualizar ────────────────────────────────────────────────────────────────

describe("ingresoRepository.actualizar", () => {
  it("debería actualizar por id con los datos y INCLUDE", async () => {
    prisma.ingreso.update.mockResolvedValue({ ...ingresoMock, efectivo: 400000, total: 550000 });

    await repo.actualizar(prisma, 1, { efectivo: 400000, total: 550000 });

    expect(prisma.ingreso.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: { efectivo: 400000, total: 550000 }, include: INCLUDE,
    });
  });
});

// ── eliminar ──────────────────────────────────────────────────────────────────

describe("ingresoRepository.eliminar", () => {
  it("debería llamar prisma.ingreso.delete con where id", async () => {
    prisma.ingreso.delete.mockResolvedValue(ingresoMock);

    await repo.eliminar(prisma, 1);

    expect(prisma.ingreso.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

// ── resumenPorSede ────────────────────────────────────────────────────────────

describe("ingresoRepository.resumenPorSede", () => {
  it("debería hacer groupBy sedeId con _sum de los tres campos de dinero", async () => {
    prisma.ingreso.groupBy.mockResolvedValue([]);

    await repo.resumenPorSede(prisma, 18);

    expect(prisma.ingreso.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by:    ["sedeId"],
        where: { semana: 18 },
        _sum:  { efectivo: true, cuentas: true, total: true },
        _count: { id: true },
      }),
    );
  });
});

// ── totalesPorDia ─────────────────────────────────────────────────────────────

describe("ingresoRepository.totalesPorDia", () => {
  it("debería hacer groupBy fecha ordenado asc con _sum de los tres campos", async () => {
    prisma.ingreso.groupBy.mockResolvedValue([]);

    await repo.totalesPorDia(prisma, 18);

    expect(prisma.ingreso.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by:      ["fecha"],
        where:   { semana: 18 },
        _sum:    { efectivo: true, cuentas: true, total: true },
        orderBy: { fecha: "asc" },
      }),
    );
  });
});
