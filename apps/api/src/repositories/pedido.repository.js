/**
 * Capa de acceso a datos — sin lógica de negocio.
 */

const incluirDetalle = {
  cliente: { select: { id: true, nombre: true, telefono: true } },
  creador: { select: { id: true, nombreCompleto: true } },
  sede: { select: { id: true, nombre: true } },
  detalles: {
    include: { producto: { select: { codigo: true, descripcion: true } } },
  },
  asignaciones: {
    select: {
      id: true, estado: true, asignadoEn: true, fechaConfirmada: true,
      entregador: { select: { id: true, nombreCompleto: true } },
    },
  },
};

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} data
 */
async function crear(prisma, data) {
  return prisma.pedido.create({ data, include: incluirDetalle });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ clienteId?: number, estado?: string, creadoPorId?: number, skip?: number, take?: number }} filtros
 */
async function listar(prisma, { clienteId, estado, creadoPorId, sedeId, skip = 0, take = 50 } = {}) {
  const where = {};
  if (clienteId)   where.clienteId   = clienteId;
  if (estado)      where.estado      = estado;
  if (creadoPorId) where.creadoPorId = creadoPorId;
  // Filtrar por sede: solo los pedidos creados por usuarios de esa sede
  if (sedeId)      where.creador     = { sedeId };

  return prisma.pedido.findMany({
    where,
    include: incluirDetalle,
    orderBy: { creadoEn: "desc" },
    skip,
    take,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} id
 */
async function buscarPorId(prisma, id) {
  return prisma.pedido.findUnique({ where: { id }, include: incluirDetalle });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} id
 * @param {{ estado?: string, observaciones?: string, totalRecibido?: number }} data
 */
async function actualizar(prisma, id, data) {
  return prisma.pedido.update({ where: { id }, data, include: incluirDetalle });
}

module.exports = { crear, listar, buscarPorId, actualizar };
