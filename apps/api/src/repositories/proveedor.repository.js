/**
 * Capa de acceso a datos para el modelo Proveedor.
 */

const proveedorRepository = (prisma) => ({

  findById: (id) =>
    prisma.proveedor.findUnique({ where: { id } }),

  findByNombre: (nombre) =>
    prisma.proveedor.findFirst({ where: { nombre } }),

  findAll: ({ nombre, activo, skip = 0, take = 50 } = {}) => {
    const where = {};
    if (nombre !== undefined) where.nombre = { contains: nombre };
    if (activo !== undefined) where.activo = activo;
    return prisma.proveedor.findMany({
      where,
      orderBy: { nombre: "asc" },
      skip,
      take,
    });
  },

  create: (data) =>
    prisma.proveedor.create({ data }),

  update: (id, data) =>
    prisma.proveedor.update({ where: { id }, data }),
});

module.exports = proveedorRepository;
