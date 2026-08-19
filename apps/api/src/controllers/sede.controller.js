const { registrarAccion } = require("../utils/logger");

const sedeController = {
  listar: async (request, reply) => {
    const { activo } = request.query ?? {};
    const where = {};
    if (activo === "true") where.activo = true;
    if (activo === "false") where.activo = false;

    const sedes = await request.server.prisma.sede.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        tipo: true,
        bodegaId: true,
        activo: true,
        creadoEn: true,
        bodega: { select: { id: true, nombre: true } },
        oficinas: { select: { id: true, nombre: true } },
      },
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
      where: { nombre: { equals: nombre } },
      select: { id: true },
    });
    if (existe) {
      return reply.code(409).send({ error: `Ya existe una sede llamada "${nombre}".` });
    }

    const tipo = request.body.tipo === "Oficina" ? "Oficina" : "Bodega";
    const data = { nombre, tipo };
    if (request.body.bodegaId != null) {
      if (tipo !== "Oficina") {
        return reply.code(400).send({ error: "Solo las oficinas pueden asignar una bodega." });
      }
      data.bodegaId = Number(request.body.bodegaId);
      const bodega = await request.server.prisma.sede.findUnique({
        where: { id: data.bodegaId },
        select: { id: true, tipo: true, activo: true },
      });
      if (!bodega || bodega.tipo !== "Bodega" || !bodega.activo) {
        return reply.code(400).send({ error: "La bodega seleccionada no existe, no es de tipo Bodega o está inactiva." });
      }
    }

    const sede = await request.server.prisma.sede.create({
      data,
      select: { id: true, nombre: true, tipo: true, bodegaId: true, activo: true },
    });

    await registrarAccion(
      request.server,
      request.user.id,
      "CREAR_SEDE",
      `Creó la sede "${sede.nombre}" (${sede.tipo}).`,
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
          nombre: { equals: nombre },
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
    if (request.body.tipo !== undefined) {
      const tipo = request.body.tipo === "Oficina" ? "Oficina" : "Bodega";
      if (tipo === "Bodega" && data.bodegaId !== undefined && data.bodegaId !== null) {
        return reply.code(400).send({ error: "Una sede de tipo Bodega no puede tener bodega asignada." });
      }
      data.tipo = tipo;
    }
    if (request.body.bodegaId !== undefined) {
      data.bodegaId = request.body.bodegaId === null ? null : Number(request.body.bodegaId);
      if (data.bodegaId != null) {
        const bodega = await request.server.prisma.sede.findUnique({
          where: { id: data.bodegaId },
          select: { id: true, tipo: true, activo: true },
        });
        if (!bodega || bodega.tipo !== "Bodega" || !bodega.activo) {
          return reply.code(400).send({ error: "La bodega seleccionada no existe, no es de tipo Bodega o está inactiva." });
        }
      }
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
      select: { id: true, nombre: true, tipo: true, bodegaId: true, activo: true },
    });

    await registrarAccion(
      request.server,
      request.user.id,
      "EDITAR_SEDE",
      `Actualizó la sede "${sede.nombre}" (tipo=${sede.tipo}, activo=${sede.activo}).`,
    );

    return reply.send(sede);
  },
};

module.exports = sedeController;