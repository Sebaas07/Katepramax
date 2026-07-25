/**
 * envio.repository.js
 * Acceso a datos de las guías de envío entre sedes.
 */

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

function envioRepository(prisma) {
  return {
    async crear(data) {
      return prisma.envio.create({ data, include: incluirDetalle });
    },

    async buscarPorId(id) {
      return prisma.envio.findUnique({ where: { id }, include: incluirDetalle });
    },

    async listar({ skip = 0, take = 50, ...where }) {
      return prisma.envio.findMany({
        where,
        include: incluirDetalle,
        orderBy: { fechaEnvio: "desc" },
        skip,
        take,
      });
    },

    async contar(where) {
      return prisma.envio.count({ where });
    },

    async actualizarEstado(id, data) {
      return prisma.envio.update({ where: { id }, data, include: incluirDetalle });
    },

    async actualizarDetalle(detalleId, data) {
      return prisma.envioDetalle.update({ where: { id: detalleId }, data });
    },
  };
}

module.exports = envioRepository;
