const crypto = require("crypto");

/**
 * Repositorio de sesiones.
 * El refresh token nunca se guarda en texto plano — solo su SHA-256.
 */
const sesionRepository = (prisma) => {
  const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

  return {
    crear: async ({ usuarioId, ip, userAgent, minutosExpiracion = 15 }) => {
      const refreshToken = crypto.randomBytes(40).toString("hex");
      const refreshHash = hashToken(refreshToken);

      const expiraEn = new Date();
      expiraEn.setMinutes(expiraEn.getMinutes() + minutosExpiracion);

      const sesion = await prisma.sesion.create({
        data: { usuarioId, refreshHash, ip, userAgent, expiraEn },
      });

      return { sesionId: sesion.id, refreshToken };
    },

    findByRefreshToken: async (refreshToken) => {
      const refreshHash = hashToken(refreshToken);
      return prisma.sesion.findFirst({
        where: {
          refreshHash,
          activa: true,
          expiraEn: { gt: new Date() },
        },
        include: {
          usuario: {
            include: { sede: { select: { nombre: true } } },
          },
        },
      });
    },

    findById: async (id) =>
      prisma.sesion.findFirst({
        where: { id, activa: true, expiraEn: { gt: new Date() } },
        include: {
          usuario: {
            select: {
              id: true,
              rol: true,
              activo: true,
              sedeId: true,
              usuario: true,
              nombreCompleto: true,
              sede: {
                select: {
                  id: true,
                  tipo: true,
                  bodegaId: true,
                  oficinas: { select: { id: true } },
                  bodega: {
                    select: { oficinas: { select: { id: true } } },
                  },
                },
              },
            },
          },
        },
      }),

    rotar: async (sesionId, ip, userAgent, minutosExpiracion = 15) => {
      const refreshToken = crypto.randomBytes(40).toString("hex");
      const refreshHash = hashToken(refreshToken);

      const expiraEn = new Date();
      expiraEn.setMinutes(expiraEn.getMinutes() + minutosExpiracion);

      await prisma.sesion.update({
        where: { id: sesionId },
        data: { refreshHash, ip, userAgent, expiraEn },
      });

      return refreshToken;
    },

    revocar: async (id, usuarioId) =>
      prisma.sesion.updateMany({
        where: {
          id,
          usuarioId,
        },
        data: { activa: false },
      }),

    actualizarExpiracion: async (id, minutosExpiracion = 15) => {
      const expiraEn = new Date();
      expiraEn.setMinutes(expiraEn.getMinutes() + minutosExpiracion);
      return prisma.sesion.update({ where: { id }, data: { expiraEn } });
    },

    revocarTodas: async (usuarioId) =>
      prisma.sesion.updateMany({
        where: { usuarioId, activa: true },
        data: { activa: false },
      }),

    limpiarExpiradas: async () =>
      prisma.sesion.deleteMany({
        where: {
          OR: [
            { expiraEn: { lt: new Date() } },
            { activa: false },
          ],
        },
      }),
  };
};

module.exports = sesionRepository;
