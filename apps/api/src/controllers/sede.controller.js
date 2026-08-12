const { registrarAccion } = require("../utils/logger");

const sedeController = {
  listar: async (request, reply) => {
    const { activo } = request.query ?? {};
    const where = {};
    if (activo === "true") where.activo = true;
    if (activo === "false") where.activo = false;

    const sedes = await request.server.prisma.sede.findMany({
      where,
      select: { id: true, nombre: true, activo: true, creadoEn: true },
      orderBy: { nombre: "asc" },
    });
    return reply.send(sedes);
  },

  crear: async (request, reply) => {
    const nombre = String(request.body.nombre ?? "").trim();
    if (!nombre) {
      return reply.code(400).send({ error: "El nombre de la sede es obligatorio." });
    }

    const existe = await request.server.prisma.sede.findFirst({
      where: { nombre: { equals: nombre, mode: "insensitive" } },
      select: { id: true },
    });
    if (existe) {
      return reply.code(409).send({ error: `Ya existe una sede llamada "${nombre}".` });
    }

    const sede = await request.server.prisma.sede.create({
      data: { nombre },
      select: { id: true, nombre: true, activo: true },
    });

    await registrarAccion(
      request.server,
      request.user.id,
      "CREAR_SEDE",
      `Creó la sede "${sede.nombre}".`,
    );

    return reply.code(201).send(sede);
  },

  editar: async (request, reply) => {
    const id = Number(request.params.id);
    const data = {};
    if (request.body.nombre !== undefined) {
      const nombre = String(request.body.nombre).trim();
      if (!nombre) {
        return reply.code(400).send({ error: "El nombre de la sede no puede estar vacío." });
      }
      const duplicada = await request.server.prisma.sede.findFirst({
        where: {
          id: { not: id },
          nombre: { equals: nombre, mode: "insensitive" },
        },
        select: { id: true },
      });
      if (duplicada) {
        return reply.code(409).send({ error: `Ya existe otra sede llamada "${nombre}".` });
      }
      data.nombre = nombre;
    }
    if (request.body.activo !== undefined) {
      data.activo = Boolean(request.body.activo);
    }

    if (Object.keys(data).length === 0) {
      return reply.code(400).send({ error: "No hay campos para actualizar." });
    }

    const existe = await request.server.prisma.sede.findUnique({ where: { id } });
    if (!existe) {
      return reply.code(404).send({ error: `Sede ${id} no encontrada.` });
    }

    const sede = await request.server.prisma.sede.update({
      where: { id },
      data,
      select: { id: true, nombre: true, activo: true },
    });

    await registrarAccion(
      request.server,
      request.user.id,
      "EDITAR_SEDE",
      `Actualizó la sede "${sede.nombre}" (activo=${sede.activo}).`,
    );

    return reply.send(sede);
  },
};

module.exports = sedeController;