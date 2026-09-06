

const INCLUDE = { sede: { select: { id: true, nombre: true } } };

async function crear(prisma, data) {
  return prisma.ingreso.create({ data, include: INCLUDE });
}

async function listar(prisma, { fecha, semana, sedeId, skip = 0, take = 50 } = {}) {
  const where = {};
  if (fecha)  where.fecha  = fecha;
  if (semana) where.semana = semana;
  if (sedeId) where.sedeId = sedeId;
  return prisma.ingreso.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ fecha: "desc" }, { sedeId: "asc" }],
    skip,
    take,
  });
}

async function buscarPorId(prisma, id) {
  return prisma.ingreso.findUnique({ where: { id }, include: INCLUDE });
}

async function actualizar(prisma, id, data) {
  return prisma.ingreso.update({ where: { id }, data, include: INCLUDE });
}

async function eliminar(prisma, id) {
  return prisma.ingreso.delete({ where: { id } });
}

async function resumenPorSede(prisma, semana, sedeId) {
  return prisma.ingreso.groupBy({
    by: ["sedeId"],
    where: { semana, ...(sedeId ? { sedeId } : {}) },
    _sum:   { efectivo: true, cuentas: true, total: true },
    _count: { id: true },
    orderBy: { sedeId: "asc" },
  });
}

async function totalesPorDia(prisma, semana, sedeId) {
  return prisma.ingreso.groupBy({
    by: ["fecha"],
    where: { semana, ...(sedeId ? { sedeId } : {}) },
    _sum:  { efectivo: true, cuentas: true, total: true },
    orderBy: { fecha: "asc" },
  });
}

module.exports = { crear, listar, buscarPorId, actualizar, eliminar, resumenPorSede, totalesPorDia };
