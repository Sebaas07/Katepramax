/**
 * Tests unitarios — proveedor.repository.js
 * El repo usa factory: proveedorRepository(prisma) => { findById, findByNombre, ... }
 */
const { prisma }           = require("../__mocks__/prisma");
const proveedorRepository  = require("../../src/repositories/proveedor.repository");

const repo = proveedorRepository(prisma);

const proveedorMock = {
  id: 1,
  nombre: "Cemex Colombia",
  activo: true,
  creadoEn: new Date(),
};

// ── findById ──────────────────────────────────────────────────────────────────

describe("proveedorRepository.findById", () => {
  it("debería buscar por id único", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);

    const result = await repo.findById(1);

    expect(prisma.proveedor.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result.id).toBe(1);
  });

  it("debería retornar null si no existe", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    const result = await repo.findById(999);

    expect(result).toBeNull();
  });
});

// ── findByNombre ──────────────────────────────────────────────────────────────

describe("proveedorRepository.findByNombre", () => {
  it("debería buscar por nombre exacto con findFirst", async () => {
    prisma.proveedor.findFirst.mockResolvedValue(proveedorMock);

    const result = await repo.findByNombre("Cemex Colombia");

    expect(prisma.proveedor.findFirst).toHaveBeenCalledWith({
      where: { nombre: "Cemex Colombia" },
    });
    expect(result.nombre).toBe("Cemex Colombia");
  });

  it("debería retornar null si no hay coincidencia", async () => {
    prisma.proveedor.findFirst.mockResolvedValue(null);

    const result = await repo.findByNombre("No Existe");

    expect(result).toBeNull();
  });
});

// ── findAll ───────────────────────────────────────────────────────────────────

describe("proveedorRepository.findAll", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await repo.findAll();

    expect(prisma.proveedor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 })
    );
  });

  it("debería filtrar por nombre con contains", async () => {
    prisma.proveedor.findMany.mockResolvedValue([proveedorMock]);

    await repo.findAll({ nombre: "Cemex" });

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.nombre).toEqual({ contains: "Cemex" });
  });

  it("debería filtrar por activo si se pasa", async () => {
    prisma.proveedor.findMany.mockResolvedValue([proveedorMock]);

    await repo.findAll({ activo: true });

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(true);
  });

  it("no debería incluir activo en where si es undefined", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await repo.findAll({ activo: undefined });

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBeUndefined();
  });

  it("no debería incluir nombre en where si es undefined", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await repo.findAll({ nombre: undefined });

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.nombre).toBeUndefined();
  });

  it("debería ordenar por nombre ascendente", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await repo.findAll();

    expect(prisma.proveedor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { nombre: "asc" } })
    );
  });
});

// ── create ────────────────────────────────────────────────────────────────────

describe("proveedorRepository.create", () => {
  it("debería llamar prisma.proveedor.create con los datos correctos", async () => {
    prisma.proveedor.create.mockResolvedValue(proveedorMock);

    await repo.create({ nombre: "Cemex Colombia" });

    expect(prisma.proveedor.create).toHaveBeenCalledWith({
      data: { nombre: "Cemex Colombia" },
    });
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe("proveedorRepository.update", () => {
  it("debería actualizar por id con los datos dados", async () => {
    prisma.proveedor.update.mockResolvedValue({ ...proveedorMock, nombre: "Editado" });

    await repo.update(1, { nombre: "Editado" });

    expect(prisma.proveedor.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { nombre: "Editado" },
    });
  });

  it("debería poder actualizar activo a false", async () => {
    prisma.proveedor.update.mockResolvedValue({ ...proveedorMock, activo: false });

    await repo.update(1, { activo: false });

    expect(prisma.proveedor.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { activo: false },
    });
  });
});