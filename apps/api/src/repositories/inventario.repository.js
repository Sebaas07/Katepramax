/**
 * inventario.repository.js
 * Capa de acceso a datos — sin lógica de negocio.
 */

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ fecha: Date, semana: number, sedeId: number, cantidad: number, costo: number }} data
 */
async function crear(prisma, data) {
  return prisma.inventario.create({ data });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ fecha?: Date, semana?: number, sedeId?: number, skip?: number, take?: number }} filtros
 */
async function listar(prisma, { fecha, semana, sedeId, skip = 0, take = 50 } = {}) {
  const where = {};
  if (fecha)   where.fecha  = fecha;
  if (semana)  where.semana = semana;
  if (sedeId)  where.sedeId = sedeId;

  return prisma.inventario.findMany({
    where,
    include: { sede: { select: { id: true, nombre: true } } },
    orderBy: [{ fecha: "desc" }, { sedeId: "asc" }],
    skip,
    take,
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} id
 */
async function buscarPorId(prisma, id) {
  return prisma.inventario.findUnique({
    where: { id },
    include: { sede: { select: { id: true, nombre: true } } },
  });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} id
 * @param {{ cantidad?: number, costo?: number }} data
 */
async function actualizar(prisma, id, data) {
  return prisma.inventario.update({ where: { id }, data });
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} id
 */
async function eliminar(prisma, id) {
  return prisma.inventario.delete({ where: { id } });
}

/**
 * Resumen consolidado de la última semana por sede.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {number} semana
 */
async function resumenSemanal(prisma, semana) {
  return prisma.inventario.groupBy({
    by: ["sedeId"],
    where: { semana },
    _sum:  { cantidad: true, costo: true },
    _max:  { fecha: true },
    orderBy: { sedeId: "asc" },
  });
}

module.exports = { crear, listar, buscarPorId, actualizar, eliminar, resumenSemanal };
