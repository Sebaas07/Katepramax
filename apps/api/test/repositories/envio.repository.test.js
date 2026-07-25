/**
 * Tests unitarios — envio.repository.js
 * El repositorio usa el patrón factory: envioRepo(prisma) → objeto con métodos.
 */
const { prisma } = require("../__mocks__/prisma");
const envioRepo = require("../../src/repositories/envio.repository");

const repo = envioRepo(prisma);

const incluirDetalle = {
  sedeOrigen: { select: { id: true, nombre: true } },
  sedeDestino: { select: { id: true, nombre: true } },
  creador: { select: { id: true, nombreCompleto: true } },
  confirmador: { select: { id: true, nombreCompleto: true } },
  detalles: {
    include: {
      producto: { select: { codigo: true, descripcion: true, sku: true } },
    },
  },
};

const envioMock = {
  id: 1,
  sedeOrigenId: 1,
  sedeDestinoId: 2,
  creadoPorId: 1,
  estado: "Pendiente",
  detalles: [{ id: 1, productoId: 1, cantidadEnviada: 10, cantidadRecibida: null }],
};

describe("envioRepository.crear", () => {
  it("debería llamar prisma.envio.create con data e incluirDetalle", async () => {
    prisma.envio.create.mockResolvedValue(envioMock);
    const data = { sedeOrigenId: 1, sedeDestinoId: 2, creadoPorId: 1 };

    const result = await repo.crear(data);

    expect(prisma.envio.create).toHaveBeenCalledWith({ data, include: incluirDetalle });
    expect(result).toEqual(envioMock);
  });
});

describe("envioRepository.buscarPorId", () => {
  it("debería buscar por id único con incluirDetalle", async () => {
    prisma.envio.findUnique.mockResolvedValue(envioMock);

    const result = await repo.buscarPorId(1);

    expect(prisma.envio.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: incluirDetalle,
    });
    expect(result).toEqual(envioMock);
  });
});

describe("envioRepository.listar", () => {
  it("debería listar con where, skip, take e incluirDetalle", async () => {
    prisma.envio.findMany.mockResolvedValue([envioMock]);

    const result = await repo.listar({ sedeDestinoId: 2, skip: 0, take: 20 });

    expect(prisma.envio.findMany).toHaveBeenCalledWith({
      where: { sedeDestinoId: 2 },
      include: incluirDetalle,
      orderBy: { fechaEnvio: "desc" },
      skip: 0,
      take: 20,
    });
    expect(result).toEqual([envioMock]);
  });

  it("debería usar skip/take por defecto si no se pasan", async () => {
    prisma.envio.findMany.mockResolvedValue([]);

    await repo.listar({ estado: "Pendiente" });

    expect(prisma.envio.findMany).toHaveBeenCalledWith({
      where: { estado: "Pendiente" },
      include: incluirDetalle,
      orderBy: { fechaEnvio: "desc" },
      skip: 0,
      take: 50,
    });
  });
});

describe("envioRepository.contar", () => {
  it("debería llamar prisma.envio.count con el where dado", async () => {
    prisma.envio.count.mockResolvedValue(3);

    const result = await repo.contar({ estado: "Pendiente", sedeDestinoId: 2 });

    expect(prisma.envio.count).toHaveBeenCalledWith({
      where: { estado: "Pendiente", sedeDestinoId: 2 },
    });
    expect(result).toBe(3);
  });
});

describe("envioRepository.actualizarEstado", () => {
  it("debería actualizar por id con los datos e incluirDetalle", async () => {
    prisma.envio.update.mockResolvedValue({ ...envioMock, estado: "Confirmado" });

    const result = await repo.actualizarEstado(1, { estado: "Confirmado" });

    expect(prisma.envio.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { estado: "Confirmado" },
      include: incluirDetalle,
    });
    expect(result.estado).toBe("Confirmado");
  });
});

describe("envioRepository.actualizarDetalle", () => {
  it("debería actualizar el detalle por id", async () => {
    prisma.envioDetalle.update.mockResolvedValue({ id: 1, cantidadRecibida: 8 });

    const result = await repo.actualizarDetalle(1, { cantidadRecibida: 8, observacion: "Faltaron 2" });

    expect(prisma.envioDetalle.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { cantidadRecibida: 8, observacion: "Faltaron 2" },
    });
    expect(result.cantidadRecibida).toBe(8);
  });
});
