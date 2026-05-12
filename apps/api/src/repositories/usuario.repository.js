/**
 * Todas las queries de Prisma relacionadas con Usuario.
 * Ningún controller ni service toca app.prisma directamente para este modelo.
 */
const usuarioRepository = (prisma) => ({

  findByUsuario: (usuario) =>
    prisma.usuario.findUnique({ where: { usuario }, include: { sede: true } }),

  findByCorreo: (correo) =>
    prisma.usuario.findUnique({ where: { correo } }),

  findById: (id) =>
    prisma.usuario.findUnique({
      where: { id },
      select: { id: true, nombreCompleto: true, usuario: true, correo: true, rol: true, sedeId: true, sede: { select: { nombre: true } }, activo: true, telefono: true, creadoEn: true },
    }),

  findAll: () =>
    prisma.usuario.findMany({
      select: { id: true, nombreCompleto: true, usuario: true, correo: true, rol: true, sedeId: true, sede: { select: { nombre: true } }, activo: true, telefono: true, creadoEn: true },
      orderBy: { nombreCompleto: "asc" },
    }),

  create: (data) => prisma.usuario.create({ data }),

  update: (id, data) =>
    prisma.usuario.update({ where: { id }, data }),

  updateUltimoAcceso: (id) =>
    prisma.usuario.update({ where: { id }, data: { ultimoAcceso: new Date() } }),

  setActivo: (id, activo) =>
    prisma.usuario.update({ where: { id }, data: { activo } }),
});

module.exports = usuarioRepository;
