

const INCLUDE = { sede: { select: { id: true, nombre: true } } };

async function crear(prisma, data) {
  return prisma.egreso.create({ data, include: INCLUDE });
}

async function listar(prisma, { fecha, semana, sedeId, concepto, skip = 0, take = 50 } = {}) {
  const where = {};
  if (fecha)    where.fecha    = fecha;
  if (semana)   where.semana   = semana;
  if (sedeId)   where.sedeId   = sedeId;
  if (concepto) where.concepto = { contains: concepto, mode: "insensitive" };
  return prisma.egreso.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ fecha: "desc" }, { sedeId: "asc" }],
    skip,
    take,
  });
}

async function buscarPorId(prisma, id) {
  return prisma.egreso.findUnique({ where: { id }, include: INCLUDE });
}

async function actualizar(prisma, id, data) {
  return prisma.egreso.update({ where: { id }, data, include: INCLUDE });
}

async function eliminar(prisma, id) {
  return prisma.egreso.delete({ where: { id } });
}

async function resumenPorSede(prisma, semana, sedeId) {
  return prisma.egreso.groupBy({
    by: ["sedeId"],
    where: { semana, ...(sedeId ? { sedeId } : {}) },
    _sum:   { total: true },
    _count: { id: true },
    orderBy: { sedeId: "asc" },
  });
}

async function resumenPorConcepto(prisma, semana, sedeId) {
  return prisma.egreso.groupBy({
    by: ["concepto"],
    where: { semana, ...(sedeId ? { sedeId } : {}) },
    _sum:   { total: true },
    _count: { id: true },
    orderBy: { _sum: { total: "desc" } },
  });
}

async function totalesPorDia(prisma, semana, sedeId) {
  return prisma.egreso.groupBy({
    by: ["fecha"],
    where: { semana, ...(sedeId ? { sedeId } : {}) },
    _sum:  { total: true },
    orderBy: { fecha: "asc" },
  });
}

module.exports = { crear, listar, buscarPorId, actualizar, eliminar, resumenPorSede, resumenPorConcepto, totalesPorDia };
