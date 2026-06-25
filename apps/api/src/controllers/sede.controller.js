const sedeController = {
  listar: async (request, reply) => {
    const { activo } = request.query ?? {};
    const where = {};
    if (activo === "true") where.activo = true;
    if (activo === "false") where.activo = false;

    const sedes = await request.server.prisma.sede.findMany({
      where,
      select: { id: true, nombre: true, activo: true },
      orderBy: { nombre: "asc" },
    });
    return reply.send(sedes);
  },
};

module.exports = sedeController;
