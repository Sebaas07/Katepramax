/**
 * Capa de acceso a datos para el modelo Cliente.
 */

const clienteRepository = (prisma) => ({
  findById: (id) =>
    prisma.cliente.findUnique({
      where: { id },
      include: { sede: { select: { id: true, nombre: true } } },
    }),

  findAll: ({ nombre, activo, sedeId, skip = 0, take = 50 } = {}) => {
    const where = {};
    if (nombre) where.nombre = { contains: nombre };
    if (activo !== undefined) where.activo = activo;
    if (sedeId) where.sedeId = sedeId;
    return prisma.cliente.findMany({
      where,
      include: { sede: { select: { id: true, nombre: true } } },
      orderBy: { nombre: "asc" },
      skip,
      take,
    });
  },

  create: (data) =>
    prisma.cliente.create({
      data,
      include: { sede: { select: { id: true, nombre: true } } },
    }),

  update: async (id, data) => {
    return prisma.cliente.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.telefono !== undefined && { telefono: data.telefono }),
        ...(data.activo !== undefined && { activo: data.activo }),
        ...(data.limiteCredito !== undefined && {
          limiteCredito: data.limiteCredito,
        }),
        ...(data.saldoDeuda !== undefined && { saldoDeuda: data.saldoDeuda }),
        ...(data.sedeId !== undefined && { sedeId: data.sedeId }),
      },
      include: { sede: { select: { id: true, nombre: true } } },
    });
  },

  setActivo: (id, activo) =>
    prisma.cliente.update({ where: { id }, data: { activo } }),

  abonar: (id, monto) =>
    prisma.cliente.update({
      where: { id },
      data: { saldoDeuda: { decrement: monto } },
      include: { sede: { select: { id: true, nombre: true } } },
    }),
});

module.exports = clienteRepository;
