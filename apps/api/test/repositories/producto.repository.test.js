/**
 * Verificamos que cada método construya la query correcta hacia Prisma.
 */
const { prisma }          = require("../__mocks__/prisma");
const productoRepository  = require("../../src/repositories/producto.repository");

const productoMock = {
  id: 1,
  codigo: "PROD-001",
  descripcion: "Cemento Gris 50kg",
  precioCosto: 18000,
  precioVenta: 25000,
  activo: true,
  proveedorId: 1,
  proveedor: { id: 1, nombre: "Proveedor Test" },
  stockSedes: [],
};

// ── buscarPorCodigo ───────────────────────────────────────────────────────────

describe("productoRepository.buscarPorCodigo", () => {
  it("debería buscar por código único e incluir proveedor y stockSedes", async () => {
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    const result = await productoRepository.buscarPorCodigo(prisma, "PROD-001");

    expect(prisma.producto.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { codigo: "PROD-001" },
        include: expect.objectContaining({
          proveedor:  expect.anything(),
          stockSedes: expect.anything(),
        }),
      })
    );
    expect(result.codigo).toBe("PROD-001");
  });

  it("debería retornar null si no existe", async () => {
    prisma.producto.findUnique.mockResolvedValue(null);

    const result = await productoRepository.buscarPorCodigo(prisma, "NO-EXISTE");

    expect(result).toBeNull();
  });
});

// ── listar ────────────────────────────────────────────────────────────────────

describe("productoRepository.listar", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.producto.findMany.mockResolvedValue([]);

    await productoRepository.listar(prisma);

    expect(prisma.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 })
    );
  });

  it("debería filtrar por descripcion con contains", async () => {
    prisma.producto.findMany.mockResolvedValue([productoMock]);

    await productoRepository.listar(prisma, { descripcion: "Cemento" });

    const callWhere = prisma.producto.findMany.mock.calls[0][0].where;
    expect(callWhere.descripcion).toEqual({ contains: "Cemento" });
  });

  it("debería filtrar por activo si se pasa", async () => {
    prisma.producto.findMany.mockResolvedValue([productoMock]);

    await productoRepository.listar(prisma, { activo: true });

    const callWhere = prisma.producto.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(true);
  });

  it("debería filtrar por proveedorId si se pasa", async () => {
    prisma.producto.findMany.mockResolvedValue([productoMock]);

    await productoRepository.listar(prisma, { proveedorId: 1 });

    const callWhere = prisma.producto.findMany.mock.calls[0][0].where;
    expect(callWhere.proveedorId).toBe(1);
  });

  it("no debería incluir activo en where si es undefined", async () => {
    prisma.producto.findMany.mockResolvedValue([]);

    await productoRepository.listar(prisma, { activo: undefined });

    const callWhere = prisma.producto.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBeUndefined();
  });

  it("debería ordenar por descripcion ascendente", async () => {
    prisma.producto.findMany.mockResolvedValue([]);

    await productoRepository.listar(prisma);

    expect(prisma.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { descripcion: "asc" } })
    );
  });

  it("debería incluir proveedor y stockSedes en los resultados", async () => {
    prisma.producto.findMany.mockResolvedValue([productoMock]);

    await productoRepository.listar(prisma);

    expect(prisma.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          proveedor:  expect.anything(),
          stockSedes: expect.anything(),
        }),
      })
    );
  });
});

// ── crear ─────────────────────────────────────────────────────────────────────

describe("productoRepository.crear", () => {
  it("debería llamar prisma.producto.create con data e include", async () => {
    prisma.producto.create.mockResolvedValue(productoMock);

    const data = { codigo: "PROD-001", descripcion: "Cemento", precioCosto: 18000, precioVenta: 25000 };
    await productoRepository.crear(prisma, data);

    expect(prisma.producto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data,
        include: expect.objectContaining({ proveedor: expect.anything() }),
      })
    );
  });
});

// ── actualizar ────────────────────────────────────────────────────────────────

describe("productoRepository.actualizar", () => {
  it("debería actualizar por código con los datos dados", async () => {
    prisma.producto.update.mockResolvedValue({ ...productoMock, precioVenta: 30000 });

    await productoRepository.actualizar(prisma, "PROD-001", { precioVenta: 30000 });

    expect(prisma.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { codigo: "PROD-001" },
        data: { precioVenta: 30000 },
      })
    );
  });

  it("debería incluir proveedor en el resultado", async () => {
    prisma.producto.update.mockResolvedValue(productoMock);

    await productoRepository.actualizar(prisma, "PROD-001", { activo: false });

    expect(prisma.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({ proveedor: expect.anything() }),
      })
    );
  });
});