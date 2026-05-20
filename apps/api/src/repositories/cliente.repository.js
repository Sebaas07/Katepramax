/**
 * Capa de acceso a datos para el modelo Cliente.
 */

const clienteRepository = (prisma) => ({

  findById: (id) =>
    prisma.cliente.findUnique({ where: { id } }),

  findAll: ({ nombre, activo, skip = 0, take = 50 } = {}) => {
    const where = {};
    if (nombre)          where.nombre = { contains: nombre };
    if (activo !== undefined) where.activo = activo;
    return prisma.cliente.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip,
      take,
    });
  },

  create: (data) =>
    prisma.cliente.create({ data }),

  update: (id, data) =>
    prisma.cliente.update({ where: { id }, data }),

  setActivo: (id, activo) =>
    prisma.cliente.update({ where: { id }, data: { activo } }),
});

module.exports = clienteRepository;
