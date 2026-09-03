/**
 * Tests unitarios — egreso.repository.js
 */
const { prisma } = require("../__mocks__/prisma");
const repo       = require("../../src/repositories/egreso.repository");

const INCLUDE = { sede: { select: { id: true, nombre: true } } };

const egresoMock = {
  id: 1, fecha: new Date("2026-05-05"), semana: 18,
  sedeId: 1, concepto: "Transporte", total: 80000, observacion: null,
};

// ── crear ─────────────────────────────────────────────────────────────────────

describe("egresoRepository.crear", () => {
  it("debería llamar prisma.egreso.create con data e INCLUDE", async () => {
    prisma.egreso.create.mockResolvedValue(egresoMock);
    const data = { fecha: new Date("2026-05-05"), semana: 18, sedeId: 1, concepto: "Transporte", total: 80000 };

    await repo.crear(prisma, data);

    expect(prisma.egreso.create).toHaveBeenCalledWith({ data, include: INCLUDE });
  });
});

// ── listar ────────────────────────────────────────────────────────────────────

describe("egresoRepository.listar", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.egreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma);

    expect(prisma.egreso.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería filtrar por semana si se pasa", async () => {
    prisma.egreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { semana: 18 });

    const where = prisma.egreso.findMany.mock.calls[0][0].where;
    expect(where.semana).toBe(18);
  });

  it("debería filtrar por sedeId si se pasa", async () => {
    prisma.egreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { sedeId: 1 });

    const where = prisma.egreso.findMany.mock.calls[0][0].where;
    expect(where.sedeId).toBe(1);
  });

  it("debería filtrar concepto con contains si se pasa", async () => {
    prisma.egreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { concepto: "Trans" });

    const where = prisma.egreso.findMany.mock.calls[0][0].where;
    expect(where.concepto).toEqual({ contains: "Trans", mode: "insensitive" });
  });

  it("debería ordenar por fecha desc y sedeId asc", async () => {
    prisma.egreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma);

    expect(prisma.egreso.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ fecha: "desc" }, { sedeId: "asc" }] }),
    );
  });

  it("no debería incluir keys undefined en where", async () => {
    prisma.egreso.findMany.mockResolvedValue([]);

    await repo.listar(prisma, {});

    const where = prisma.egreso.findMany.mock.calls[0][0].where;
    expect(where.semana).toBeUndefined();
    expect(where.sedeId).toBeUndefined();
    expect(where.concepto).toBeUndefined();
  });
});

// ── buscarPorId ───────────────────────────────────────────────────────────────

describe("egresoRepository.buscarPorId", () => {
  it("debería buscar por id único con INCLUDE", async () => {
    prisma.egreso.findUnique.mockResolvedValue(egresoMock);

    const result = await repo.buscarPorId(prisma, 1);

    expect(prisma.egreso.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: INCLUDE });
    expect(result.id).toBe(1);
  });

  it("debería retornar null si no existe", async () => {
    prisma.egreso.findUnique.mockResolvedValue(null);

    const result = await repo.buscarPorId(prisma, 999);

    expect(result).toBeNull();
  });
});

// ── actualizar ────────────────────────────────────────────────────────────────

describe("egresoRepository.actualizar", () => {
  it("debería actualizar por id con los datos y INCLUDE", async () => {
    prisma.egreso.update.mockResolvedValue({ ...egresoMock, total: 90000 });

    await repo.actualizar(prisma, 1, { total: 90000 });

    expect(prisma.egreso.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: { total: 90000 }, include: INCLUDE,
    });
  });
});

// ── eliminar ──────────────────────────────────────────────────────────────────

describe("egresoRepository.eliminar", () => {
  it("debería llamar prisma.egreso.delete con where id", async () => {
    prisma.egreso.delete.mockResolvedValue(egresoMock);

    await repo.eliminar(prisma, 1);

    expect(prisma.egreso.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

// ── resumenPorSede ────────────────────────────────────────────────────────────

describe("egresoRepository.resumenPorSede", () => {
  it("debería hacer groupBy sedeId con _sum.total y filtrado por semana", async () => {
    prisma.egreso.groupBy.mockResolvedValue([]);

    await repo.resumenPorSede(prisma, 18);

    expect(prisma.egreso.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by:    ["sedeId"],
        where: { semana: 18 },
        _sum:  { total: true },
        _count: { id: true },
      }),
    );
  });
});

// ── resumenPorConcepto ────────────────────────────────────────────────────────

describe("egresoRepository.resumenPorConcepto", () => {
  it("debería hacer groupBy concepto ordenado por total desc", async () => {
    prisma.egreso.groupBy.mockResolvedValue([]);

    await repo.resumenPorConcepto(prisma, 18);

    expect(prisma.egreso.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by:      ["concepto"],
        where:   { semana: 18 },
        _sum:    { total: true },
        orderBy: { _sum: { total: "desc" } },
      }),
    );
  });
});

// ── totalesPorDia ─────────────────────────────────────────────────────────────

describe("egresoRepository.totalesPorDia", () => {
  it("debería hacer groupBy fecha ordenado asc con _sum.total", async () => {
    prisma.egreso.groupBy.mockResolvedValue([]);

    await repo.totalesPorDia(prisma, 18);

    expect(prisma.egreso.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by:      ["fecha"],
        where:   { semana: 18 },
        _sum:    { total: true },
        orderBy: { fecha: "asc" },
      }),
    );
  });
});
