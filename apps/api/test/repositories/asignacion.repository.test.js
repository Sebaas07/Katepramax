/**
 * Tests unitarios — asignacion.repository.js
 * El repositorio usa el patrón factory: asignacionRepo(prisma) → objeto con métodos.
 */
const { prisma }      = require("../__mocks__/prisma");
const asignacionRepo  = require("../../src/repositories/asignacion.repository");

const repo = asignacionRepo(prisma);

const incluirDetalle = {
  pedido: {
    select: {
      id: true,
      estado: true,
      direccion: true,
      observaciones: true,
      sedeId: true,
      creadoEn: true,
      detalles: {
        select: {
          id: true,
          productoId: true,
          cantidad: true,
          precioUnitario: true,
          subtotal: true,
          producto: { select: { descripcion: true } },
        },
      },
      cliente: { select: { id: true, nombre: true, telefono: true, saldoDeuda: true } },
    },
  },
  entregador: { select: { id: true, nombreCompleto: true, telefono: true } },
  asignador:  { select: { id: true, nombreCompleto: true } },
};

const asignacionMock = {
  id: 1, pedidoId: 1, entregadorId: 3, asignadoPorId: 2,
  estado: "Pendiente", montoCobrado: null, metodoPago: null,
  fechaConfirmada: null, observacionesEntrega: null, asignadoEn: new Date(),
  pedido:     { id: 1, estado: "Asignado", observaciones: null, cliente: { id: 1, nombre: "Juan", telefono: null } },
  entregador: { id: 3, nombreCompleto: "Carlos", telefono: null },
  asignador:  { id: 2, nombreCompleto: "Bodega" },
};

// ── crear ─────────────────────────────────────────────────────────────────────

describe("asignacionRepository.crear", () => {
  it("debería llamar prisma.asignacionEntrega.create con data e incluirDetalle", async () => {
    prisma.asignacionEntrega.create.mockResolvedValue(asignacionMock);
    const data = { pedidoId: 1, entregadorId: 3, asignadoPorId: 2 };

    await repo.crear(data);

    expect(prisma.asignacionEntrega.create).toHaveBeenCalledWith({
      data, include: incluirDetalle,
    });
  });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe("asignacionRepository.findById", () => {
  it("debería buscar por id único con incluirDetalle", async () => {
    prisma.asignacionEntrega.findUnique.mockResolvedValue(asignacionMock);

    const result = await repo.findById(1);

    expect(prisma.asignacionEntrega.findUnique).toHaveBeenCalledWith({
      where: { id: 1 }, include: incluirDetalle,
    });
    expect(result.id).toBe(1);
  });

  it("debería retornar null si no existe", async () => {
    prisma.asignacionEntrega.findUnique.mockResolvedValue(null);

    const result = await repo.findById(999);

    expect(result).toBeNull();
  });
});

// ── listar ────────────────────────────────────────────────────────────────────

describe("asignacionRepository.listar", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.asignacionEntrega.findMany.mockResolvedValue([]);

    await repo.listar();

    expect(prisma.asignacionEntrega.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería filtrar por entregadorId si se pasa", async () => {
    prisma.asignacionEntrega.findMany.mockResolvedValue([]);

    await repo.listar({ entregadorId: 3 });

    const where = prisma.asignacionEntrega.findMany.mock.calls[0][0].where;
    expect(where.entregadorId).toBe(3);
  });

  it("debería filtrar por estado si se pasa", async () => {
    prisma.asignacionEntrega.findMany.mockResolvedValue([]);

    await repo.listar({ estado: "EnRuta" });

    const where = prisma.asignacionEntrega.findMany.mock.calls[0][0].where;
    expect(where.estado).toBe("EnRuta");
  });

  it("debería filtrar por pedidoId si se pasa", async () => {
    prisma.asignacionEntrega.findMany.mockResolvedValue([]);

    await repo.listar({ pedidoId: 5 });

    const where = prisma.asignacionEntrega.findMany.mock.calls[0][0].where;
    expect(where.pedidoId).toBe(5);
  });

  it("debería ordenar por asignadoEn desc", async () => {
    prisma.asignacionEntrega.findMany.mockResolvedValue([]);

    await repo.listar();

    expect(prisma.asignacionEntrega.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { asignadoEn: "desc" } }),
    );
  });

  it("no debería incluir keys undefined en where", async () => {
    prisma.asignacionEntrega.findMany.mockResolvedValue([]);

    await repo.listar({});

    const where = prisma.asignacionEntrega.findMany.mock.calls[0][0].where;
    expect(where.entregadorId).toBeUndefined();
    expect(where.estado).toBeUndefined();
    expect(where.pedidoId).toBeUndefined();
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe("asignacionRepository.update", () => {
  it("debería actualizar por id con los datos e incluirDetalle", async () => {
    const actualizado = { ...asignacionMock, estado: "EnRuta" };
    prisma.asignacionEntrega.update.mockResolvedValue(actualizado);

    await repo.update(1, { estado: "EnRuta" });

    expect(prisma.asignacionEntrega.update).toHaveBeenCalledWith({
      where:   { id: 1 },
      data:    { estado: "EnRuta" },
      include: incluirDetalle,
    });
  });
});
