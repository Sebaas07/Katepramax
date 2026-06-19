const INCLUDE = {
  sede: { select: { id: true, nombre: true } },
  producto: { select: { codigo: true, descripcion: true, precioCosto: true } },
};

async function crear(
  prisma,
  {
    fecha,
    semana,
    sedeId,
    productoId,
    cantidadIngresada,
    costoUnitario,
    tipo,
    nota,
  },
) {
  return prisma.inventario.create({
    data: {
      fecha,
      semana,
      sedeId,
      productoId,
      cantidadIngresada,
      costoUnitario,
      tipo: tipo ?? "entrada",
      nota: nota ?? null,
    },
    include: INCLUDE,
  });
}

const upsertDiario = crear;

async function listar(
  prisma,
  { fecha, semana, sedeId, productoId, tipo, skip = 0, take = 50 } = {},
) {
  const where = {};
  if (fecha) where.fecha = fecha;
  if (semana) where.semana = semana;
  if (sedeId) where.sedeId = sedeId;
  if (productoId) where.productoId = productoId;
  if (tipo) where.tipo = tipo;
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

async function actualizar(
  prisma,
  id,
  { cantidadIngresada, costoUnitario, nota },
) {
  const data = {};
  if (cantidadIngresada !== undefined)
    data.cantidadIngresada = cantidadIngresada;
  if (costoUnitario !== undefined) data.costoUnitario = costoUnitario;
  if (nota !== undefined) data.nota = nota;
  return prisma.inventario.update({ where: { id }, data, include: INCLUDE });
}

async function eliminar(prisma, id) {
  return prisma.inventario.delete({ where: { id } });
}

async function resumenSemanal(prisma, semana) {
  return prisma.inventario.groupBy({
    by: ["sedeId", "productoId"],
    where: { semana },
    _sum: { cantidadIngresada: true, costoUnitario: true },
    _max: { fecha: true },
    orderBy: { sedeId: "asc" },
  });
}

module.exports = {
  crear,
  upsertDiario,
  listar,
  buscarPorId,
  actualizar,
  eliminar,
  resumenSemanal,
};
