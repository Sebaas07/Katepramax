/**
 * Capa de acceso a datos para AsignacionEntrega.
 */

const incluirDetalle = {
  pedido: {
    select: {
      id: true, estado: true, observaciones: true,
      cliente: { select: { id: true, nombre: true, telefono: true } },
    },
  },
  entregador: { select: { id: true, nombreCompleto: true, telefono: true } },
  asignador:  { select: { id: true, nombreCompleto: true } },
};

const asignacionRepository = (prisma) => ({

  crear: (data) =>
    prisma.asignacionEntrega.create({ data, include: incluirDetalle }),

  findById: (id) =>
    prisma.asignacionEntrega.findUnique({ where: { id }, include: incluirDetalle }),

  listar: ({ entregadorId, estado, pedidoId, skip = 0, take = 50 } = {}) => {
    const where = {};
    if (entregadorId) where.entregadorId = entregadorId;
    if (estado)       where.estado       = estado;
    if (pedidoId)     where.pedidoId     = pedidoId;

    return prisma.asignacionEntrega.findMany({
      where,
      include: incluirDetalle,
      orderBy: { asignadoEn: "desc" },
      skip,
      take,
    });
  },

  update: (id, data) =>
    prisma.asignacionEntrega.update({ where: { id }, data, include: incluirDetalle }),
});

module.exports = asignacionRepository;
