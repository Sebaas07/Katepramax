

const INCLUDE = {
  proveedor: { select: { id: true, nombre: true } },
  sede:      { select: { id: true, nombre: true } },
};

async function crear(prisma, data) {
  return prisma.abono.create({ data, include: INCLUDE });
}

async function listar(prisma, { proveedorId, sedeId, semana, fecha, skip = 0, take = 50 } = {}) {
  const where = {};
  if (proveedorId) where.proveedorId = proveedorId;
  if (sedeId)      where.sedeId      = sedeId;
  if (semana)      where.semana      = semana;
  if (fecha)       where.fecha       = fecha;
  return prisma.abono.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ fecha: "desc" }, { proveedorId: "asc" }],
    skip,
    take,
  });
}

async function buscarPorId(prisma, id) {
  return prisma.abono.findUnique({ where: { id }, include: INCLUDE });
}

async function actualizar(prisma, id, data) {
  return prisma.abono.update({ where: { id }, data, include: INCLUDE });
}

async function eliminar(prisma, id) {
  return prisma.abono.delete({ where: { id } });
}

// Total pagado a cada proveedor en una semana
async function resumenPorProveedor(prisma, semana) {
  return prisma.abono.groupBy({
    by:      ["proveedorId"],
    where:   { semana },
    _sum:    { valorPagado: true },
    _count:  { id: true },
    orderBy: { proveedorId: "asc" },
  });
}

// Total pagado por sede en una semana (para el Arqueo)
async function resumenPorSede(prisma, semana) {
  return prisma.abono.groupBy({
    by:      ["sedeId"],
    where:   { semana },
    _sum:    { valorPagado: true },
    orderBy: { sedeId: "asc" },
  });
}

module.exports = { crear, listar, buscarPorId, actualizar, eliminar, resumenPorProveedor, resumenPorSede };
