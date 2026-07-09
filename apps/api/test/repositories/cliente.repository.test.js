/**
 * Tests unitarios — cliente.repository.js
 *
 * Verificamos que cada método construya la query correcta hacia Prisma.
 */
const { prisma } = require("../__mocks__/prisma");
const clienteRepository = require("../../src/repositories/cliente.repository");

const repo = clienteRepository(prisma);

const clienteMock = {
  id: 1,
  nombre: "Juan Pérez",
  telefono: "3001234567",
  activo: true,
  limiteCredito: 0,
  creadoEn: new Date(),
};

// ── findById ──────────────────────────────────────────────────────────────────

describe("clienteRepository.findById", () => {
  it("debería buscar por id único", async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);

    const result = await repo.findById(1);

    expect(prisma.cliente.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: { sede: { select: { id: true, nombre: true } } },
    });
    expect(result.id).toBe(1);
  });

  it("debería retornar null si no existe", async () => {
    prisma.cliente.findUnique.mockResolvedValue(null);

    const result = await repo.findById(999);

    expect(result).toBeNull();
  });
});

// ── findAll ───────────────────────────────────────────────────────────────────

describe("clienteRepository.findAll", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.cliente.findMany.mockResolvedValue([]);

    await repo.findAll();

    expect(prisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería filtrar por nombre con contains", async () => {
    prisma.cliente.findMany.mockResolvedValue([clienteMock]);

    await repo.findAll({ nombre: "Juan" });

    const callWhere = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(callWhere.nombre).toEqual({ contains: "Juan" });
  });

  it("debería filtrar por activo si se pasa", async () => {
    prisma.cliente.findMany.mockResolvedValue([clienteMock]);

    await repo.findAll({ activo: true });

    const callWhere = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(true);
  });

  it("no debería incluir activo en el where si es undefined", async () => {
    prisma.cliente.findMany.mockResolvedValue([]);

    await repo.findAll({ activo: undefined });

    const callWhere = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBeUndefined();
  });

  it("debería ordenar por nombre ascendente", async () => {
    prisma.cliente.findMany.mockResolvedValue([]);

    await repo.findAll();

    expect(prisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { nombre: "asc" } }),
    );
  });
});

// ── create ────────────────────────────────────────────────────────────────────

describe("clienteRepository.create", () => {
  it("debería llamar prisma.cliente.create con los datos correctos", async () => {
    prisma.cliente.create.mockResolvedValue(clienteMock);

    const data = { nombre: "Juan Pérez", telefono: "3001234567" };
    await repo.create(data);

    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data,
      include: { sede: { select: { id: true, nombre: true } } },
    });
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe("clienteRepository.update", () => {
  it("debería actualizar por id con los datos dados", async () => {
    prisma.cliente.update.mockResolvedValue({
      ...clienteMock,
      nombre: "Editado",
    });

    await repo.update(1, { nombre: "Editado" });

    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { nombre: "Editado" },
      include: { sede: { select: { id: true, nombre: true } } },
    });
  });
});

// ── setActivo ─────────────────────────────────────────────────────────────────

describe("clienteRepository.setActivo", () => {
  it("debería actualizar activo a false", async () => {
    prisma.cliente.update.mockResolvedValue({ ...clienteMock, activo: false });

    await repo.setActivo(1, false);

    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { activo: false },
    });
  });

  it("debería actualizar activo a true", async () => {
    prisma.cliente.update.mockResolvedValue({ ...clienteMock, activo: true });

    await repo.setActivo(1, true);

    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { activo: true },
    });
  });
});
