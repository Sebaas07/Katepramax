/**
 * Tests unitarios — proveedor.service.js
 * El service usa factory: proveedorService(app) => { listar, obtenerPorId, ... }
 */
const { prisma }         = require("./__mocks__/prisma");
const proveedorService   = require("../src/services/proveedor.service");

const appMock = { prisma };
const svc     = proveedorService(appMock);

// ── Datos de prueba ───────────────────────────────────────────────────────────

const proveedorMock = {
  id: 1,
  nombre: "Cemex Colombia",
  activo: true,
  creadoEn: new Date(),
};

// ── listar ────────────────────────────────────────────────────────────────────

describe("proveedorService.listar", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await svc.listar({});

    expect(prisma.proveedor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 })
    );
  });

  it("debería convertir activo='true' a booleano true", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await svc.listar({ activo: "true" });

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(true);
  });

  it("debería convertir activo='false' a booleano false", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await svc.listar({ activo: "false" });

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(false);
  });

  it("no debería incluir activo en where si no se pasa", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await svc.listar({});

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBeUndefined();
  });

  it("debería filtrar por nombre si se pasa", async () => {
    prisma.proveedor.findMany.mockResolvedValue([proveedorMock]);

    await svc.listar({ nombre: "Cemex" });

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.nombre).toEqual({ contains: "Cemex" });
  });
});

// ── obtenerPorId ──────────────────────────────────────────────────────────────

describe("proveedorService.obtenerPorId", () => {
  it("debería retornar el proveedor si existe", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);

    const result = await svc.obtenerPorId(1);

    expect(result.id).toBe(1);
    expect(result.nombre).toBe("Cemex Colombia");
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(svc.obtenerPorId(999))
      .rejects.toMatchObject({ statusCode: 404, message: expect.stringMatching(/no encontrado/i) });
  });
});

// ── crear ─────────────────────────────────────────────────────────────────────

describe("proveedorService.crear", () => {
  it("debería lanzar AppError 409 si el nombre ya existe", async () => {
    prisma.proveedor.findFirst.mockResolvedValue(proveedorMock);

    await expect(svc.crear({ nombre: "Cemex Colombia" }))
      .rejects.toMatchObject({ statusCode: 409, message: expect.stringMatching(/ya existe/i) });
  });

  it("debería crear el proveedor si el nombre es único", async () => {
    prisma.proveedor.findFirst.mockResolvedValue(null);
    prisma.proveedor.create.mockResolvedValue({ ...proveedorMock, id: 2, nombre: "Nuevo" });

    const result = await svc.crear({ nombre: "Nuevo" });

    expect(result.nombre).toBe("Nuevo");
    expect(prisma.proveedor.create).toHaveBeenCalledWith({ data: { nombre: "Nuevo" } });
  });
});

// ── actualizar ────────────────────────────────────────────────────────────────

describe("proveedorService.actualizar", () => {
  it("debería lanzar AppError 404 si el proveedor no existe", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(svc.actualizar(999, { nombre: "Editado" }))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería lanzar AppError 409 si el nuevo nombre colisiona con otro proveedor", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.findFirst.mockResolvedValue({ id: 2, nombre: "Nombre Colision" });

    await expect(svc.actualizar(1, { nombre: "Nombre Colision" }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it("no debería verificar colisión si el nombre no cambia", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.update.mockResolvedValue(proveedorMock);

    await svc.actualizar(1, { nombre: "Cemex Colombia" }); // mismo nombre

    expect(prisma.proveedor.findFirst).not.toHaveBeenCalled();
  });

  it("debería actualizar solo campos permitidos (nombre y activo)", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.findFirst.mockResolvedValue(null);
    prisma.proveedor.update.mockResolvedValue({ ...proveedorMock, nombre: "Cemex Editado" });

    await svc.actualizar(1, { nombre: "Cemex Editado", campoExtra: "ignorar" });

    const callData = prisma.proveedor.update.mock.calls[0][0].data;
    expect(callData).toHaveProperty("nombre", "Cemex Editado");
    expect(callData).not.toHaveProperty("campoExtra");
  });
});

// ── desactivar ────────────────────────────────────────────────────────────────

describe("proveedorService.desactivar", () => {
  it("debería lanzar AppError 404 si el proveedor no existe", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(svc.desactivar(999))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería actualizar activo a false y retornar mensaje", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.update.mockResolvedValue({ ...proveedorMock, activo: false });

    const result = await svc.desactivar(1);

    expect(prisma.proveedor.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { activo: false },
    });
    expect(result.mensaje).toMatch(/desactivado/i);
  });
});