/**
 * producto.repository.js
 * Capa de acceso a datos — sin lógica de negocio.
 */

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ codigo: string, descripcion: string, precioCosto: number, precioVenta: number, precioMayoreo?: number, porcentajeGanancia?: number, proveedorId?: number }} data
 */
async function crear(prisma, data) {
  return prisma.producto.create({ data, include: { proveedor: { select: { id: true, nombre: true } } } });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ descripcion?: string, activo?: boolean, proveedorId?: number, departamento?: string, sedeId?: number, skip?: number, take?: number }} filtros
 */
async function listar(prisma, { descripcion, activo, proveedorId, departamento, sedeId, skip = 0, take = 50 } = {}) {
  const where = {};
  if (activo !== undefined)   where.activo = activo;
  if (proveedorId)            where.proveedorId = proveedorId;
  if (descripcion)            where.descripcion = { contains: descripcion, mode: "insensitive" };
  if (departamento)           where.departamento = departamento;
  if (sedeId != null)         where.stockSedes = { some: { sedeId: Number(sedeId) } };

  return prisma.producto.findMany({
    where,
    include: {
      proveedor:  { select: { id: true, nombre: true } },
      stockSedes: { select: { sedeId: true, stockActual: true, sede: { select: { nombre: true } } } },
    },
    orderBy: { descripcion: "asc" },
    skip,
    take,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} codigo
 */
async function buscarPorCodigo(prisma, codigo) {
  return prisma.producto.findUnique({
    where: { codigo },
    include: {
      proveedor:  { select: { id: true, nombre: true } },
      stockSedes: { select: { sedeId: true, stockActual: true, sede: { select: { nombre: true } } } },
    },
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} codigo
 * @param {object} data
 */
async function actualizar(prisma, codigo, data) {
  return prisma.producto.update({
    where: { codigo },
    data,
    include: {
      proveedor:  { select: { id: true, nombre: true } },
      stockSedes: { select: { sedeId: true, stockActual: true, sede: { select: { nombre: true } } } },
    },
  });
}

module.exports = { crear, listar, buscarPorCodigo, actualizar };
