const INCLUDE = { sede: { select: { id: true, nombre: true } } };

async function crear(prisma, data) {
  return prisma.cartera.create({ data, include: INCLUDE });
}

async function listar(prisma, { fecha, semana, sedeId, skip = 0, take = 50 } = {}) {
  const where = {};
  if (fecha)  where.fecha  = new Date(fecha);
  if (semana) where.semana = Number(semana);
  if (sedeId) where.sedeId = Number(sedeId);
  return prisma.cartera.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ fecha: "desc" }, { sedeId: "asc" }],
    skip,
    take,
  });
}

async function buscarPorId(prisma, id) {
  return prisma.cartera.findUnique({ where: { id }, include: INCLUDE });
}

async function actualizar(prisma, id, data) {
  return prisma.cartera.update({ where: { id }, data, include: INCLUDE });
}

async function actualizarPorSedeFecha(prisma, sedeId, fecha, data) {
  return prisma.cartera.update({
    where: { sedeId_fecha: { sedeId: Number(sedeId), fecha } },
    data,
    include: INCLUDE,
  });
}

async function eliminar(prisma, id) {
  return prisma.cartera.delete({ where: { id } });
}

async function ultimoAnterior(prisma, sedeId, fecha, idExcluir = null) {
  return prisma.cartera.findFirst({
    where: {
      sedeId: Number(sedeId),
      fecha: { lt: fecha },
      ...(idExcluir ? { id: { not: Number(idExcluir) } } : {}),
    },
    orderBy: { fecha: "desc" },
    select: { saldoDia: true },
  });
}

module.exports = { crear, listar, buscarPorId, actualizar, actualizarPorSedeFecha, eliminar, ultimoAnterior };
