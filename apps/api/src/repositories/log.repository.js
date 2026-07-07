const logRepository = (prisma) => ({
  listar: async (filtros) => {
    const { usuarioId, accion, fechaInicio, fechaFin, skip, take } = filtros;

    const where = {};
    if (usuarioId) where.usuarioId = usuarioId;
    if (accion) where.accion = accion;
    if (fechaInicio || fechaFin) {
      where.creadoEn = {};
      if (fechaInicio) {
        const desde = new Date(fechaInicio);
        desde.setUTCHours(0, 0, 0, 0);
        where.creadoEn.gte = desde;
      }
      if (fechaFin) {
        const hasta = new Date(fechaFin);
        hasta.setUTCHours(23, 59, 59, 999);
        where.creadoEn.lte = hasta;
      }
    }

    const [total, data] = await Promise.all([
      prisma.log.count({ where }),
      prisma.log.findMany({
        where,
        include: {
          usuario: { select: { id: true, nombreCompleto: true, rol: true } },
        },
        orderBy: { creadoEn: "desc" },
        skip,
        take,
      }),
    ]);

    return { total, data };
  },

  listarAcciones: async () => {
    const filas = await prisma.log.findMany({
      distinct: ["accion"],
      select: { accion: true },
      orderBy: { accion: "asc" },
    });
    return filas.map((f) => f.accion);
  },
});

module.exports = logRepository;
