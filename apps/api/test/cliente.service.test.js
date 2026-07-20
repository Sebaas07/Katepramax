/**
 * Tests unitarios — cliente.service.js
 */
const { prisma } = require("./__mocks__/prisma");
const clienteService = require("../src/services/cliente.service");

const adminMock = { rol: "Admin", sedeId: null };
const appMock = { prisma };
const svc = clienteService(appMock);

// ── Datar de prueba ───────────────────────────────────────────────────────────

const clienteMock = {
  id: 1,
  nombre: "Juan Pérez",
  telefono: "3001234567",
  activo: true,
  limiteCredito: 0,
  creadoEn: new Date(),
};

// ── listar ────────────────────────────────────────────────────────────────────

describe("clienteService.listar", () => {
  it("debería llamar findAll con los parámetros por defecto", async () => {
    prisma.cliente.findMany.mockResolvedValue([clienteMock]);

    await svc.listar({}, adminMock);

    expect(prisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería convertir activo='true' a booleano true", async () => {
    prisma.cliente.findMany.mockResolvedValue([]);

    await svc.listar({ activo: "true" }, adminMock);

    const callWhere = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(true);
  });

  it("debería convertir activo='false' a booleano false", async () => {
    prisma.cliente.findMany.mockResolvedValue([]);

    await svc.listar({ activo: "false" }, adminMock);

    const callWhere = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBe(false);
  });

  it("no debería incluir activo en el where si no se pasa", async () => {
    prisma.cliente.findMany.mockResolvedValue([]);

    await svc.listar({}, adminMock);

    const callWhere = prisma.cliente.findMany.mock.calls[0][0].where;
    expect(callWhere.activo).toBeUndefined();
  });

  it("debería respetar skip y take personalizados", async () => {
    prisma.cliente.findMany.mockResolvedValue([]);

    await svc.listar({ skip: "10", take: "5" }, adminMock);

    expect(prisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 }),
    );
  });
});

// ── obtenerPorId ──────────────────────────────────────────────────────────────

describe("clienteService.obtenerPorId", () => {
  it("debería retornar el cliente si existe", async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);

    const result = await svc.obtenerPorId(1, adminMock);

    expect(result.id).toBe(1);
    expect(result.nombre).toBe("Juan Pérez");
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.cliente.findUnique.mockResolvedValue(null);

    await expect(svc.obtenerPorId(999, adminMock)).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/no encontrado/i),
    });
  });
});

// ── crear ─────────────────────────────────────────────────────────────────────

describe("clienteService.crear", () => {
  it("debería crear el cliente solo con nombre y telefono", async () => {
    prisma.cliente.create.mockResolvedValue(clienteMock);

    await svc.crear({
      nombre: "Juan Pérez",
      telefono: "3001234567",
      campoExtra: "ignorado",
    }, adminMock);

    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: { nombre: "Juan Pérez", telefono: "3001234567" },
      include: { sede: { select: { id: true, nombre: true } } },
    });
  });
});

// ── actualizar ────────────────────────────────────────────────────────────────

describe("clienteService.actualizar", () => {
  it("debería lanzar AppError 404 si el cliente no existe", async () => {
    prisma.cliente.findUnique.mockResolvedValue(null);

    await expect(
      svc.actualizar(999, { nombre: "Nuevo" }, adminMock),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería actualizar solo los campos permitidos", async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);
    prisma.cliente.update.mockResolvedValue({
      ...clienteMock,
      nombre: "Editado",
    });

    await svc.actualizar(1, {
      nombre: "Editado",
      campoNoPermitido: "ignorar",
    }, adminMock);

    const callData = prisma.cliente.update.mock.calls[0][0].data;
    expect(callData).toHaveProperty("nombre", "Editado");
    expect(callData).not.toHaveProperty("campoNoPermitido");
  });

  it("debería permitir actualizar limiteCredito", async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);
    prisma.cliente.update.mockResolvedValue({
      ...clienteMock,
      limiteCredito: 500000,
    });

    await svc.actualizar(1, { limiteCredito: 500000 }, adminMock);

    const callData = prisma.cliente.update.mock.calls[0][0].data;
    expect(callData.limiteCredito).toBe(500000);
  });
});

// ── desactivar ────────────────────────────────────────────────────────────────

describe("clienteService.desactivar", () => {
  it("debería lanzar AppError 404 si el cliente no existe", async () => {
    prisma.cliente.findUnique.mockResolvedValue(null);

    await expect(svc.desactivar(999, adminMock)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("debería llamar setActivo con false y retornar mensaje", async () => {
    prisma.cliente.findUnique.mockResolvedValue(clienteMock);
    prisma.cliente.update.mockResolvedValue({ ...clienteMock, activo: false });

    const result = await svc.desactivar(1, adminMock);

    expect(prisma.cliente.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { activo: false },
    });
    expect(result.mensaje).toMatch(/desactivado/i);
  });
});
