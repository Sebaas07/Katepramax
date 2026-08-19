const crypto = require("crypto");

/**
 * Repositorio de sesiones.
 * El refresh token nunca se guarda en texto plano — solo su SHA-256.
 */
const sesionRepository = (prisma) => {
  const hashToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

  return {
    /**
     * Crea una nueva sesión y devuelve el refreshToken en texto plano
     * (solo se retorna una vez, luego solo existe el hash).
     * El refresh token vence tras 15 minutos de inactividad.
     */
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

    /**
     * Busca una sesión activa por el hash del refreshToken.
     * Incluye el usuario completo para validar activo y rol desde BD.
     */
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

    /** Busca sesión por ID incluyendo usuario (para el middleware). */
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
              sede: {
                select: {
                  id: true,
                  tipo: true,
                  bodegaId: true,
                  oficinas: { select: { id: true } },
                },
              },
            },
          },
        },
      }),

    /** Rota el refresh token (invalida el anterior, crea uno nuevo). */
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

    /** Revoca una sesión específica (logout). */
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

    /** Revoca TODAS las sesiones de un usuario (cambio de clave, etc). */
    revocarTodas: async (usuarioId) =>
      prisma.sesion.updateMany({
        where: { usuarioId, activa: true },
        data: { activa: false },
      }),

    /** Limpieza de sesiones expiradas (para un cron job). */
    limpiarExpiradas: async () =>
      prisma.sesion.deleteMany({
        where: {
          OR: [
            { expiraEn: { lt: new Date() } },
            { activa: false }, // Opcional: borrar las ya revocadas
          ],
        },
      }),
  };
};

module.exports = sesionRepository;
