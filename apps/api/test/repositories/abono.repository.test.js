/**
 * Tests unitarios — abono.repository.js
 * Verificamos que cada método construya la query correcta hacia Prisma.
 */
const { prisma } = require("../__mocks__/prisma");
const repo       = require("../../src/repositories/abono.repository");

const INCLUDE = {
  proveedor: { select: { id: true, nombre: true } },
  sede:      { select: { id: true, nombre: true } },
};

const abonoMock = {
  id: 1,
  fecha:       new Date("2026-05-05"),
  semana:      18,
  proveedorId: 1,
  sedeId:      1,
  valorPagado: 500000,
  observacion: null,
};

// ── crear ─────────────────────────────────────────────────────────────────────

describe("abonoRepository.crear", () => {
  it("debería llamar prisma.abono.create con data e INCLUDE", async () => {
    prisma.abono.create.mockResolvedValue(abonoMock);
    const data = { fecha: new Date("2026-05-05"), semana: 18, proveedorId: 1, sedeId: 1, valorPagado: 500000 };

    await repo.crear(prisma, data);

    expect(prisma.abono.create).toHaveBeenCalledWith({ data, include: INCLUDE });
  });
});

// ── listar ────────────────────────────────────────────────────────────────────

describe("abonoRepository.listar", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.abono.findMany.mockResolvedValue([]);

    await repo.listar(prisma);

    expect(prisma.abono.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería filtrar por proveedorId si se pasa", async () => {
    prisma.abono.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { proveedorId: 2 });

    const where = prisma.abono.findMany.mock.calls[0][0].where;
    expect(where.proveedorId).toBe(2);
  });

  it("debería filtrar por sedeId si se pasa", async () => {
    prisma.abono.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { sedeId: 1 });

    const where = prisma.abono.findMany.mock.calls[0][0].where;
    expect(where.sedeId).toBe(1);
  });

  it("debería filtrar por semana si se pasa", async () => {
    prisma.abono.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { semana: 18 });

    const where = prisma.abono.findMany.mock.calls[0][0].where;
    expect(where.semana).toBe(18);
  });

  it("debería ordenar por fecha desc y proveedorId asc", async () => {
    prisma.abono.findMany.mockResolvedValue([]);

    await repo.listar(prisma);

    expect(prisma.abono.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ fecha: "desc" }, { proveedorId: "asc" }] }),
    );
  });

  it("no debería incluir keys undefined en where", async () => {
    prisma.abono.findMany.mockResolvedValue([]);

    await repo.listar(prisma, {});

    const where = prisma.abono.findMany.mock.calls[0][0].where;
    expect(where.proveedorId).toBeUndefined();
    expect(where.sedeId).toBeUndefined();
  });
});

// ── buscarPorId ───────────────────────────────────────────────────────────────

describe("abonoRepository.buscarPorId", () => {
  it("debería buscar por id único con INCLUDE", async () => {
    prisma.abono.findUnique.mockResolvedValue(abonoMock);

    const result = await repo.buscarPorId(prisma, 1);

    expect(prisma.abono.findUnique).toHaveBeenCalledWith({ where: { id: 1 }, include: INCLUDE });
    expect(result.id).toBe(1);
  });

  it("debería retornar null si no existe", async () => {
    prisma.abono.findUnique.mockResolvedValue(null);

    const result = await repo.buscarPorId(prisma, 999);

    expect(result).toBeNull();
  });
});

// ── actualizar ────────────────────────────────────────────────────────────────

describe("abonoRepository.actualizar", () => {
  it("debería actualizar por id con los datos y INCLUDE", async () => {
    prisma.abono.update.mockResolvedValue({ ...abonoMock, valorPagado: 600000 });

    await repo.actualizar(prisma, 1, { valorPagado: 600000 });

    expect(prisma.abono.update).toHaveBeenCalledWith({
      where:   { id: 1 },
      data:    { valorPagado: 600000 },
      include: INCLUDE,
    });
  });
});

// ── eliminar ──────────────────────────────────────────────────────────────────

describe("abonoRepository.eliminar", () => {
  it("debería llamar prisma.abono.delete con where id", async () => {
    prisma.abono.delete.mockResolvedValue(abonoMock);

    await repo.eliminar(prisma, 1);

    expect(prisma.abono.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

// ── resumenPorProveedor ───────────────────────────────────────────────────────

describe("abonoRepository.resumenPorProveedor", () => {
  it("debería hacer groupBy proveedorId filtrado por semana", async () => {
    prisma.abono.groupBy.mockResolvedValue([]);

    await repo.resumenPorProveedor(prisma, 18);

    expect(prisma.abono.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by:    ["proveedorId"],
        where: { semana: 18 },
        _sum:  { valorPagado: true },
        _count: { id: true },
      }),
    );
  });
});

// ── resumenPorSede ────────────────────────────────────────────────────────────

describe("abonoRepository.resumenPorSede", () => {
  it("debería hacer groupBy sedeId filtrado por semana", async () => {
    prisma.abono.groupBy.mockResolvedValue([]);

    await repo.resumenPorSede(prisma, 18);

    expect(prisma.abono.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by:    ["sedeId"],
        where: { semana: 18 },
        _sum:  { valorPagado: true },
      }),
    );
  });
});
