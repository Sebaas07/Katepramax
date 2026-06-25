/**
 * Tests unitarios — inventario.repository.js
 */
const { prisma } = require("../__mocks__/prisma");
const inventarioRepository = require("../../src/repositories/inventario.repository");

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

// ── crear ─────────────────────────────────────────────────────────────────────

describe("inventarioRepository.crear", () => {
  it("debería crear el registro con todos los campos", async () => {
    prisma.inventario.create.mockResolvedValue(inventarioMock);

    const fecha = new Date("2026-06-02");
    await inventarioRepository.crear(prisma, {
      fecha,
      semana: 23,
      sedeId: 1,
      productoId: 1,
      cantidadIngresada: 10,
      costoUnitario: 180000,
    });

    const data = prisma.inventario.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      fecha,
      semana: 23,
      sedeId: 1,
      productoId: 1,
      cantidadIngresada: 10,
      costoUnitario: 180000,
      tipo: "entrada",
    });
  });

  it("debería incluir sede y producto en el resultado", async () => {
    prisma.inventario.create.mockResolvedValue(inventarioMock);

    await inventarioRepository.crear(prisma, {
      fecha: new Date(),
      semana: 23,
      sedeId: 1,
      productoId: 1,
      cantidadIngresada: 1,
      costoUnitario: 18000,
    });

    const callArg = prisma.inventario.create.mock.calls[0][0];
    expect(callArg.include).toMatchObject({
      sede: expect.anything(),
      producto: expect.anything(),
    });
  });

  it("debería usar 'entrada' como tipo por defecto si no se pasa", async () => {
    prisma.inventario.create.mockResolvedValue(inventarioMock);

    await inventarioRepository.crear(prisma, {
      fecha: new Date(),
      semana: 23,
      sedeId: 1,
      productoId: 1,
      cantidadIngresada: 1,
      costoUnitario: 18000,
    });

    const data = prisma.inventario.create.mock.calls[0][0].data;
    expect(data.tipo).toBe("entrada");
  });
});

// ── listar ────────────────────────────────────────────────────────────────────

describe("inventarioRepository.listar", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioRepository.listar(prisma);

    expect(prisma.inventario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería filtrar por fecha si se pasa", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);
    const fecha = new Date("2026-06-02");

    await inventarioRepository.listar(prisma, { fecha });

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.fecha).toEqual(fecha);
  });

  it("debería filtrar por semana si se pasa", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioRepository.listar(prisma, { semana: 23 });

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.semana).toBe(23);
  });

  it("debería filtrar por sedeId si se pasa", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioRepository.listar(prisma, { sedeId: 1 });

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.sedeId).toBe(1);
  });

  it("debería filtrar por productoId si se pasa", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioRepository.listar(prisma, { productoId: 1 });

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.productoId).toBe(1);
  });

  it("no debería incluir filtros undefined en where", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioRepository.listar(prisma, {});

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.fecha).toBeUndefined();
    expect(callWhere.semana).toBeUndefined();
    expect(callWhere.sedeId).toBeUndefined();
  });

  it("debería ordenar por fecha desc y productoId asc", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioRepository.listar(prisma);

    expect(prisma.inventario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ fecha: "desc" }, { productoId: "asc" }],
      }),
    );
  });
});

// ── buscarPorId ───────────────────────────────────────────────────────────────

describe("inventarioRepository.buscarPorId", () => {
  it("debería buscar por id e incluir sede y producto", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock);

    const result = await inventarioRepository.buscarPorId(prisma, 1);

    expect(prisma.inventario.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: expect.objectContaining({
        sede: expect.anything(),
        producto: expect.anything(),
      }),
    });
    expect(result.id).toBe(1);
  });

  it("debería retornar null si no existe", async () => {
    prisma.inventario.findUnique.mockResolvedValue(null);

    const result = await inventarioRepository.buscarPorId(prisma, 999);

    expect(result).toBeNull();
  });
});

// ── actualizar ────────────────────────────────────────────────────────────────

describe("inventarioRepository.actualizar", () => {
  it("debería actualizar cantidadIngresada si se pasa", async () => {
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      cantidadIngresada: 15,
    });

    await inventarioRepository.actualizar(prisma, 1, { cantidadIngresada: 15 });

    const callData = prisma.inventario.update.mock.calls[0][0].data;
    expect(callData.cantidadIngresada).toBe(15);
  });

  it("debería actualizar costoUnitario si se pasa", async () => {
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      costoUnitario: 200000,
    });

    await inventarioRepository.actualizar(prisma, 1, { costoUnitario: 200000 });

    const callData = prisma.inventario.update.mock.calls[0][0].data;
    expect(callData.costoUnitario).toBe(200000);
  });

  it("no debería incluir campos undefined en data", async () => {
    prisma.inventario.update.mockResolvedValue(inventarioMock);

    await inventarioRepository.actualizar(prisma, 1, { cantidadIngresada: 12 });

    const callData = prisma.inventario.update.mock.calls[0][0].data;
    expect(Object.keys(callData)).not.toContain("costoUnitario");
  });
});

// ── eliminar ──────────────────────────────────────────────────────────────────

describe("inventarioRepository.eliminar", () => {
  it("debería llamar delete por id", async () => {
    prisma.inventario.delete.mockResolvedValue(inventarioMock);

    await inventarioRepository.eliminar(prisma, 1);

    expect(prisma.inventario.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

// ── resumenSemanal ────────────────────────────────────────────────────────────

describe("inventarioRepository.resumenSemanal", () => {
  it("debería hacer groupBy con by=[sedeId, productoId] y filtrar por semana", async () => {
    prisma.inventario.groupBy.mockResolvedValue([]);

    await inventarioRepository.resumenSemanal(prisma, 23);

    expect(prisma.inventario.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["sedeId", "productoId"],
        where: { semana: 23 },
        _sum: expect.objectContaining({
          cantidadIngresada: true,
          costoUnitario: true,
        }),
        _max: expect.objectContaining({ fecha: true }),
      }),
    );
  });

  it("debería ordenar por sedeId ascendente", async () => {
    prisma.inventario.groupBy.mockResolvedValue([]);

    await inventarioRepository.resumenSemanal(prisma, 23);

    expect(prisma.inventario.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { sedeId: "asc" } }),
    );
  });
});
