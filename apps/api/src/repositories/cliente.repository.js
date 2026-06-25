/**
 * Capa de acceso a datos para el modelo Cliente.
 */

const clienteRepository = (prisma) => ({
  findById: (id) => prisma.cliente.findUnique({ where: { id } }),

  findAll: ({ nombre, activo, skip = 0, take = 50 } = {}) => {
    const where = {};
    if (nombre) where.nombre = { contains: nombre };
    if (activo !== undefined) where.activo = activo;
    return prisma.cliente.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip,
      take,
    });
  },

  create: (data) => prisma.cliente.create({ data }),

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
      },
    });
  },

  setActivo: (id, activo) =>
    prisma.cliente.update({ where: { id }, data: { activo } }),

  abonar: (id, monto) =>
    prisma.cliente.update({
      where: { id },
      data: { saldoDeuda: { decrement: monto } },
    }),
});

module.exports = clienteRepository;
