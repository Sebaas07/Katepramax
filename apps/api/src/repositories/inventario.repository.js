const INCLUDE = {
  sede:     { select: { id: true, nombre: true } },
  producto: { select: { codigo: true, descripcion: true, precioCosto: true } },
};

async function upsertDiario(prisma, { fecha, semana, sedeId, productoId, cantidadIngresada, costo }) {
  return prisma.inventario.upsert({
    where:  { sedeId_productoId_fecha: { sedeId, productoId, fecha } },
    create: { fecha, semana, sedeId, productoId, cantidadIngresada, costo },
    update: {
      cantidadIngresada: { increment: cantidadIngresada },
      costo:             { increment: costo },
    },
    include: INCLUDE,
  });
}

async function listar(prisma, { fecha, semana, sedeId, productoId, skip = 0, take = 50 } = {}) {
  const where = {};
  if (fecha)      where.fecha      = fecha;
  if (semana)     where.semana     = semana;
  if (sedeId)     where.sedeId     = sedeId;
  if (productoId) where.productoId = productoId;
  return prisma.inventario.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ fecha: "desc" }, { productoId: "asc" }],
    skip,
    take,
  });
}

async function buscarPorId(prisma, id) {
  return prisma.inventario.findUnique({ where: { id }, include: INCLUDE });
}

async function actualizar(prisma, id, { cantidadIngresada, costo }) {
  const data = {};
  if (cantidadIngresada !== undefined) data.cantidadIngresada = cantidadIngresada;
  if (costo             !== undefined) data.costo             = costo;
  return prisma.inventario.update({ where: { id }, data, include: INCLUDE });
}

async function eliminar(prisma, id) {
  return prisma.inventario.delete({ where: { id } });
}

// groupBy requiere todos los campos del @@unique compuesto
async function resumenSemanal(prisma, semana) {
  return prisma.inventario.groupBy({
    by:      ["sedeId", "productoId"],
    where:   { semana },
    _sum:    { cantidadIngresada: true, costo: true },
    _max:    { fecha: true },
    orderBy: { sedeId: "asc" },
  });
}

module.exports = { upsertDiario, listar, buscarPorId, actualizar, eliminar, resumenSemanal };
