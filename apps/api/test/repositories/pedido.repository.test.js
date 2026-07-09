/**
 * Tests unitarios — pedido.repository.js
 */
const { prisma } = require("../__mocks__/prisma");
const repo = require("../../src/repositories/pedido.repository");

const incluirDetalle = {
  cliente: { select: { id: true, nombre: true, telefono: true } },
  creador: { select: { id: true, nombreCompleto: true } },
  sede: { select: { id: true, nombre: true } },
  detalles: {
    include: { producto: { select: { codigo: true, descripcion: true } } },
  },
  asignaciones: {
    select: {
      id: true,
      estado: true,
      asignadoEn: true,
      fechaConfirmada: true,
      entregador: { select: { id: true, nombreCompleto: true } },
    },
  },
};

const pedidoMock = {
  id: 1,
  estado: "Pendiente",
  clienteId: 1,
  creadoPorId: 1,
  observaciones: null,
  totalRecibido: null,
  creadoEn: new Date(),
  actualizadoEn: new Date(),
  cliente: { id: 1, nombre: "Juan Pérez", telefono: null },
  creador: { id: 1, nombreCompleto: "Admin" },
  detalles: [],
  asignaciones: [],
};

// ── crear ─────────────────────────────────────────────────────────────────────

describe("pedidoRepository.crear", () => {
  it("debería llamar prisma.pedido.create con data e incluirDetalle", async () => {
    prisma.pedido.create.mockResolvedValue(pedidoMock);
    const data = { clienteId: 1, creadoPorId: 1, detalles: { create: [] } };

    await repo.crear(prisma, data);

    expect(prisma.pedido.create).toHaveBeenCalledWith({
      data,
      include: incluirDetalle,
    });
  });
});

// ── listar ────────────────────────────────────────────────────────────────────

describe("pedidoRepository.listar", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.pedido.findMany.mockResolvedValue([]);

    await repo.listar(prisma);

    expect(prisma.pedido.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería filtrar por clienteId si se pasa", async () => {
    prisma.pedido.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { clienteId: 1 });

    const where = prisma.pedido.findMany.mock.calls[0][0].where;
    expect(where.clienteId).toBe(1);
  });

  it("debería filtrar por estado si se pasa", async () => {
    prisma.pedido.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { estado: "Pendiente" });

    const where = prisma.pedido.findMany.mock.calls[0][0].where;
    expect(where.estado).toBe("Pendiente");
  });

  it("debería filtrar por creadoPorId si se pasa", async () => {
    prisma.pedido.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { creadoPorId: 2 });

    const where = prisma.pedido.findMany.mock.calls[0][0].where;
    expect(where.creadoPorId).toBe(2);
  });

  it("debería filtrar por sedeId del creador si se pasa", async () => {
    prisma.pedido.findMany.mockResolvedValue([]);

    await repo.listar(prisma, { sedeId: 1 });

    const where = prisma.pedido.findMany.mock.calls[0][0].where;
    expect(where.creador).toEqual({ sedeId: 1 });
  });

  it("debería ordenar por creadoEn desc", async () => {
    prisma.pedido.findMany.mockResolvedValue([]);

    await repo.listar(prisma);

    expect(prisma.pedido.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { creadoEn: "desc" } }),
    );
  });
});

// ── buscarPorId ───────────────────────────────────────────────────────────────

describe("pedidoRepository.buscarPorId", () => {
  it("debería buscar por id único con incluirDetalle", async () => {
    prisma.pedido.findUnique.mockResolvedValue(pedidoMock);

    const result = await repo.buscarPorId(prisma, 1);

    expect(prisma.pedido.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: incluirDetalle,
    });
    expect(result.id).toBe(1);
  });

  it("debería retornar null si no existe", async () => {
    prisma.pedido.findUnique.mockResolvedValue(null);

    const result = await repo.buscarPorId(prisma, 999);

    expect(result).toBeNull();
  });
});

// ── actualizar ────────────────────────────────────────────────────────────────

describe("pedidoRepository.actualizar", () => {
  it("debería actualizar por id con los datos e incluirDetalle", async () => {
    const actualizado = { ...pedidoMock, estado: "Cancelado" };
    prisma.pedido.update.mockResolvedValue(actualizado);

    await repo.actualizar(prisma, 1, { estado: "Cancelado" });

    expect(prisma.pedido.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { estado: "Cancelado" },
      include: incluirDetalle,
    });
  });
});
