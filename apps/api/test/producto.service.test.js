/**
 * Tests unitarios — producto.service.js
 *
 * El service recibe (app, ...args) directamente, no usa factory.
 */
const { prisma } = require("./__mocks__/prisma");
const productoService = require("../src/services/producto.service");

const appMock = { prisma };
const usuarioAdmin = { id: 1, rol: "Admin", sedeId: 1 };

// ── Datos de prueba ───────────────────────────────────────────────────────────

const productoMock = {
  id: 1,
  codigo: "PROD-001",
  sku: "GEN-001",
  descripcion: "Cemento Gris 50kg",
  precioCosto: 18000,
  precioVenta: 25000,
  precioMayoreo: 22000,
  porcentajeGanancia: 38.8,
  activo: true,
  proveedorId: 1,
  proveedor: { id: 1, nombre: "Proveedor Test" },
  stockSedes: [],
};

const proveedorMock = { id: 1, nombre: "Proveedor Test", activo: true };

// ── crear ─────────────────────────────────────────────────────────────────────

describe("productoService.crear", () => {
  it("debería lanzar AppError 409 si el código ya existe", async () => {
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    await expect(
      productoService.crear(appMock, {
        codigo: "PROD-001",
        descripcion: "Dup",
        precioCosto: 1000,
        precioVenta: 1500,
      }, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringMatching(/ya existe/i),
    });
  });

  it("debería lanzar AppError 404 si el proveedorId no existe", async () => {
    prisma.producto.findUnique.mockResolvedValue(null); // código libre
    prisma.proveedor.findUnique.mockResolvedValue(null); // proveedor no existe

    await expect(
      productoService.crear(appMock, {
        codigo: "PROD-002",
        descripcion: "Nuevo",
        precioCosto: 1000,
        precioVenta: 1500,
        proveedorId: 999,
      }, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/proveedor/i),
    });
  });

  it("debería crear el producto si el código es único y el proveedor existe", async () => {
    prisma.producto.findUnique.mockResolvedValueOnce(null);
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.skuContador.upsert.mockResolvedValue({ prefijo: "CEM", ultimoNumero: 1 });
    prisma.producto.create.mockResolvedValue(productoMock);
    prisma.producto.findUnique.mockResolvedValueOnce(productoMock);

    const result = await productoService.crear(
      appMock,
      {
        codigo: "PROD-001",
        descripcion: "Cemento Gris 50kg",
        precioCosto: 18000,
        precioVenta: 25000,
        proveedorId: 1,
      },
      usuarioAdmin,
    );

    expect(result.codigo).toBe("PROD-001");
    expect(prisma.producto.create).toHaveBeenCalledOnce();
  });

  it("debería crear el producto sin proveedor si no se pasa proveedorId", async () => {
    prisma.producto.findUnique.mockResolvedValue(null);
    prisma.skuContador.upsert.mockResolvedValue({ prefijo: "SIN", ultimoNumero: 3 });
    prisma.producto.create.mockResolvedValue({
      ...productoMock,
      proveedorId: null,
    });

    await productoService.crear(
      appMock,
      {
        codigo: "PROD-003",
        descripcion: "Sin proveedor",
        precioCosto: 5000,
        precioVenta: 8000,
      },
      usuarioAdmin,
    );

    // No debe consultar proveedor si no se pasó
    expect(prisma.proveedor.findUnique).not.toHaveBeenCalled();
    expect(prisma.producto.create).toHaveBeenCalledOnce();
  });
});

// ── obtenerLista ──────────────────────────────────────────────────────────────

describe("productoService.obtenerLista", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.producto.findMany.mockResolvedValue([]);

    await productoService.obtenerLista(appMock, {}, usuarioAdmin);

    expect(prisma.producto.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería convertir activo='true' a booleano true", async () => {
    prisma.producto.findMany.mockResolvedValue([]);

    await productoService.obtenerLista(appMock, { activo: "true" }, usuarioAdmin);

    const callWhere = prisma.producto.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(true);
  });

  it("debería convertir activo='false' a booleano false", async () => {
    prisma.producto.findMany.mockResolvedValue([]);

    await productoService.obtenerLista(appMock, { activo: "false" }, usuarioAdmin);

    const callWhere = prisma.producto.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(false);
  });

  it("debería filtrar por descripcion si se pasa", async () => {
    prisma.producto.findMany.mockResolvedValue([productoMock]);

    await productoService.obtenerLista(appMock, { descripcion: "Cemento" }, usuarioAdmin);

    const callWhere = prisma.producto.findMany.mock.calls[0][0].where;
    expect(callWhere.descripcion).toEqual({ contains: "Cemento", mode: "insensitive" });
  });

  it("debería filtrar por proveedorId como número", async () => {
    prisma.producto.findMany.mockResolvedValue([productoMock]);

    await productoService.obtenerLista(appMock, { proveedorId: "1" }, usuarioAdmin);

    const callWhere = prisma.producto.findMany.mock.calls[0][0].where;
    expect(callWhere.proveedorId).toBe(1);
  });
});

// ── obtenerPorCodigo ──────────────────────────────────────────────────────────

describe("productoService.obtenerPorCodigo", () => {
  it("debería retornar el producto si existe", async () => {
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    const result = await productoService.obtenerPorCodigo(appMock, "PROD-001", usuarioAdmin);

    expect(result.codigo).toBe("PROD-001");
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.producto.findUnique.mockResolvedValue(null);

    await expect(
      productoService.obtenerPorCodigo(appMock, "NO-EXISTE", usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/no encontrado/i),
    });
  });
});

// ── editar ────────────────────────────────────────────────────────────────────

describe("productoService.editar", () => {
  it("debería lanzar AppError 404 si el producto no existe", async () => {
    prisma.producto.findUnique.mockResolvedValue(null);

    await expect(
      productoService.editar(appMock, "NO-EXISTE", { precioVenta: 9000 }, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería lanzar AppError 404 si el nuevo proveedorId no existe", async () => {
    prisma.producto.findUnique.mockResolvedValue(productoMock); // producto existe
    prisma.proveedor.findUnique.mockResolvedValue(null); // proveedor no existe

    await expect(
      productoService.editar(appMock, "PROD-001", { proveedorId: 999 }, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/proveedor/i),
    });
  });

  it("debería actualizar el producto si todo es válido", async () => {
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.producto.update.mockResolvedValue({
      ...productoMock,
      precioVenta: 30000,
    });

    const result = await productoService.editar(
      appMock,
      "PROD-001",
      {
        precioVenta: 30000,
        proveedorId: 1,
      },
      usuarioAdmin,
    );

    expect(result.precioVenta).toBe(30000);
    expect(prisma.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { codigo: "PROD-001" } }),
    );
  });
});

// ── desactivar ────────────────────────────────────────────────────────────────

describe("productoService.desactivar", () => {
  it("debería lanzar AppError 404 si el producto no existe", async () => {
    prisma.producto.findUnique.mockResolvedValue(null);

    await expect(
      productoService.desactivar(appMock, "NO-EXISTE", usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería actualizar activo a false", async () => {
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.producto.update.mockResolvedValue({
      ...productoMock,
      activo: false,
    });

    await productoService.desactivar(appMock, "PROD-001", usuarioAdmin);

    expect(prisma.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { codigo: "PROD-001" },
        data: { activo: false },
      }),
    );
  });
});
