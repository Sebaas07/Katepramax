/**
 * Tests unitarios — proveedor.service.js
 */
const { prisma } = require("./__mocks__/prisma");
const proveedorService = require("../src/services/proveedor.service");
const AppError = require("../src/errors/AppError");

const appMock = { prisma };

// ── Datos de prueba ───────────────────────────────────────────────────────────

const proveedorMock = {
  id: 1,
  nombre: "Proveedor ABC",
  activo: true,
  creadoEn: new Date("2026-06-02"),
};

const usuarioAdmin = { id: 1, rol: "Admin", sedeId: 1 };
const usuarioBodega = { id: 2, rol: "Bodega", sedeId: 1 };
const usuarioAdminBogota = { id: 3, rol: "AdminBogota", sedeId: 2 };
const usuarioEntregador = { id: 4, rol: "Entregador", sedeId: 1 };

// ── listar ────────────────────────────────────────────────────────────────────

describe("proveedorService.listar", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await proveedorService(appMock).listar({}, usuarioAdmin);

    expect(prisma.proveedor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería convertir activo='true' a booleano true", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await proveedorService(appMock).listar({ activo: "true" }, usuarioAdmin);

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(true);
  });

  it("debería convertir activo='false' a booleano false", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await proveedorService(appMock).listar({ activo: "false" }, usuarioAdmin);

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(false);
  });

  it("no debería incluir activo en where si no se pasa", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await proveedorService(appMock).listar({}, usuarioAdmin);

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBeUndefined();
  });

  it("debería filtrar por nombre si se pasa", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await proveedorService(appMock).listar(
      { nombre: "Proveedor ABC" },
      usuarioAdmin,
    );

    const callWhere = prisma.proveedor.findMany.mock.calls[0][0].where;
    expect(callWhere.nombre).toEqual({ contains: "Proveedor ABC" });
  });

  it("debería permitir acceso a Admin, Bodega y AdminBogota", async () => {
    prisma.proveedor.findMany.mockResolvedValue([]);

    await proveedorService(appMock).listar({}, usuarioAdmin);
    await proveedorService(appMock).listar({}, usuarioBodega);
    await proveedorService(appMock).listar({}, usuarioAdminBogota);

    expect(prisma.proveedor.findMany).toHaveBeenCalledTimes(3);
  });

  // ── TEST CORREGIDO ──
  it("debería lanzar AppError 403 si usuario sin permiso intenta listar", async () => {
    const usuarioSinPermiso = { id: 4, rol: "Ventas", sedeId: 1 };

    // Usamos try/catch para tener más control
    try {
      await proveedorService(appMock).listar({}, usuarioSinPermiso);
      // Si llegamos aquí, el test falla porque no lanzó error
      expect(true).toBe(false);
    } catch (error) {
      // Verificamos que sea un AppError
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("No tienes permiso para listar proveedores.");
    }
  });
});

// ── obtenerPorId ──────────────────────────────────────────────────────────────

describe("proveedorService.obtenerPorId", () => {
  it("debería retornar el proveedor si existe", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);

    const result = await proveedorService(appMock).obtenerPorId(
      1,
      usuarioAdmin,
    );

    expect(result).toEqual(proveedorMock);
    expect(prisma.proveedor.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(
      proveedorService(appMock).obtenerPorId(999, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/no encontrado/i),
    });
  });

  it("debería lanzar AppError 403 si usuario sin permiso intenta obtener", async () => {
    const usuarioSinPermiso = { id: 4, rol: "Ventas", sedeId: 1 };

    try {
      await proveedorService(appMock).obtenerPorId(1, usuarioSinPermiso);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("No tienes permiso para ver proveedores.");
    }
  });
});

// ── crear ────────────────────────────────────────────────────────────────────

describe("proveedorService.crear", () => {
  it("debería lanzar AppError 409 si el nombre ya existe", async () => {
    prisma.proveedor.findFirst.mockResolvedValue(proveedorMock);

    await expect(
      proveedorService(appMock).crear(
        { nombre: "Proveedor ABC" },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringMatching(/Ya existe un proveedor/i),
    });
  });

  it("debería crear el proveedor si el nombre es único", async () => {
    const nuevoProveedor = { id: 3, nombre: "Nuevo Proveedor", activo: true };

    prisma.proveedor.findFirst.mockResolvedValue(null);
    prisma.proveedor.create.mockResolvedValue(nuevoProveedor);

    const result = await proveedorService(appMock).crear(
      { nombre: "Nuevo Proveedor" },
      usuarioAdmin,
    );

    expect(result).toEqual(nuevoProveedor);
    expect(prisma.proveedor.create).toHaveBeenCalledWith({
      data: { nombre: "Nuevo Proveedor" },
    });
  });

  it("debería lanzar AppError 403 si usuario sin permiso intenta crear", async () => {
    const usuarioSinPermiso = { id: 4, rol: "Ventas", sedeId: 1 };

    try {
      await proveedorService(appMock).crear(
        { nombre: "Test" },
        usuarioSinPermiso,
      );
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("No tienes permiso para crear proveedores.");
    }
  });
});

// ── actualizar ────────────────────────────────────────────────────────────────

describe("proveedorService.actualizar", () => {
  it("debería lanzar AppError 404 si el proveedor no existe", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(
      proveedorService(appMock).actualizar(
        999,
        { nombre: "Nuevo nombre" },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/no encontrado/i),
    });
  });

  it("debería lanzar AppError 409 si el nuevo nombre colisiona con otro proveedor", async () => {
    const otroProveedor = { id: 2, nombre: "Nombre Colision" };

    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.findFirst.mockResolvedValue(otroProveedor);

    await expect(
      proveedorService(appMock).actualizar(
        1,
        { nombre: "Nombre Colision" },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: expect.stringMatching(/Ya existe un proveedor/i),
    });
  });

  it("no debería verificar colisión si el nombre no cambia", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.update.mockResolvedValue({
      ...proveedorMock,
      activo: false,
    });

    await proveedorService(appMock).actualizar(
      1,
      { activo: false },
      usuarioAdmin,
    );

    expect(prisma.proveedor.findFirst).not.toHaveBeenCalled();
    expect(prisma.proveedor.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { activo: false },
    });
  });

  it("debería actualizar solo campos permitidos (nombre y activo)", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.findFirst.mockResolvedValue(null); // No hay colisión
    prisma.proveedor.update.mockResolvedValue({
      ...proveedorMock,
      nombre: "Nuevo Nombre",
      activo: false,
    });

    await proveedorService(appMock).actualizar(
      1,
      {
        nombre: "Nuevo Nombre",
        activo: false,
        campoNoPermitido: "ignorado",
      },
      usuarioAdmin,
    );

    expect(prisma.proveedor.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { nombre: "Nuevo Nombre", activo: false },
    });
  });

  it("debería lanzar AppError 403 si usuario sin permiso intenta actualizar", async () => {
    const usuarioSinPermiso = { id: 4, rol: "Ventas", sedeId: 1 };

    try {
      await proveedorService(appMock).actualizar(
        1,
        { nombre: "Test" },
        usuarioSinPermiso,
      );
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe("No tienes permiso para editar proveedores.");
    }
  });
});

// ── desactivar ──────────────────────────────────────────────────────────────

describe("proveedorService.desactivar", () => {
  it("debería lanzar AppError 404 si el proveedor no existe", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(
      proveedorService(appMock).desactivar(999, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/no encontrado/i),
    });
  });

  it("debería actualizar activo a false y retornar mensaje", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.proveedor.update.mockResolvedValue({
      ...proveedorMock,
      activo: false,
    });

    const result = await proveedorService(appMock).desactivar(1, usuarioAdmin);

    expect(result).toEqual({ mensaje: "Proveedor desactivado correctamente" });
    expect(prisma.proveedor.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { activo: false },
    });
  });

  it("debería lanzar AppError 403 si usuario sin permiso intenta desactivar", async () => {
    const usuarioSinPermiso = { id: 4, rol: "Ventas", sedeId: 1 };

    try {
      await proveedorService(appMock).desactivar(1, usuarioSinPermiso);
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(403);
      expect(error.message).toBe(
        "No tienes permiso para desactivar proveedores.",
      );
    }
  });
});
