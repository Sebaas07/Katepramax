const bcrypt = require("bcrypt");
const usuarioRepo = require("../repositories/usuario.repository");
const sesionRepo = require("../repositories/sesion.repository");
const { registrarAccion } = require("../utils/logger");
const { AppError } = require("../errors/AppError");

// Tiempo de vida del access token
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? "15m";

const authService = (app) => {
  const usuRepo = usuarioRepo(app.prisma);
  const sesRepository = sesionRepo(app.prisma);

  return {
    /**
     * Login: valida credenciales, crea sesión en BD y devuelve
     * accessToken + refreshToken.
     */
    login: async (usuario, contrasena, ip, userAgent) => {
      const user = await usuRepo.findByUsuario(usuario);

      if (!user || !user.activo)
        throw new AppError("Usuario no encontrado o inactivo", 401);

      const valida = await bcrypt.compare(contrasena, user.clave);
      if (!valida) throw new AppError("Contraseña incorrecta", 401);

      // Crear sesión en BD
      const { sesionId, refreshToken } = await sesRepository.crear({
        usuarioId: user.id,
        ip,
        userAgent,
      });

      // El Access token solo lleva el sesionId (el middleware hará el resto)
      const accessToken = app.jwt.sign(
        { sesionId },
        { expiresIn: ACCESS_TOKEN_TTL },
      );

      // Actualización asíncrona de último acceso
      Promise.resolve(usuRepo.updateUltimoAcceso(user.id)).catch(() => {});

      await registrarAccion(
        app,
        user.id,
        "LOGIN",
        `Inicio de sesión: ${user.usuario}`,
      );

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          nombreCompleto: user.nombreCompleto,
          usuario: user.usuario,
          rol: user.rol,
          sedeId: user.sedeId,
          sede: user.sede?.nombre ?? null,
        },
      };
    },

    /**
     * Refresh: implementa Rotation (RTR)
     */
    refresh: async (refreshToken, ip, userAgent) => {
      if (!refreshToken) throw new AppError("Refresh token requerido", 400);

      const sesion = await sesRepository.findByRefreshToken(refreshToken);
      if (!sesion) throw new AppError("Sesión inválida o expirada", 401);

      const { usuario } = sesion;

      if (!usuario || !usuario.activo)
        throw new AppError("Usuario inactivo", 401);

      // Rotar token: invalida el anterior y genera uno nuevo
      const nuevoRefreshToken = await sesRepository.rotar(
        sesion.id,
        ip,
        userAgent,
      );

      const accessToken = app.jwt.sign(
        { sesionId: sesion.id },
        { expiresIn: ACCESS_TOKEN_TTL },
      );

      return {
        accessToken,
        refreshToken: nuevoRefreshToken,
        user: {
          id: usuario.id,
          nombreCompleto: usuario.nombreCompleto,
          usuario: usuario.usuario,
          rol: usuario.rol,
          sedeId: usuario.sedeId,
          sede: usuario.sede?.nombre ?? null,
        },
      };
    },

    /**
     * Logout: revoca la sesión específica asegurando que pertenezca al usuario
     */
    logout: async (sesionId, usuarioId) => {
      await sesRepository.revocar(sesionId, usuarioId);
    },

    /**
     * Obtiene información del usuario autenticado
     */
    me: async (id) => {
      const user = await usuRepo.findById(id);
      if (!user) throw new AppError("Usuario no encontrado", 404);
      return user;
    },

    /**
     * Cambio de clave con revocación total de sesiones
     */
    cambiarClave: async (id, claveActual, claveNueva) => {
      const user = await app.prisma.usuario.findUnique({ where: { id } });
      if (!user) throw new AppError("Usuario no encontrado", 404);

      // Primero validar que no sean iguales
      if (claveActual === claveNueva)
        throw new AppError(
          "La nueva clave no puede ser igual a la anterior",
          400,
        );

      // Luego validar que la actual sea correcta
      const valida = await bcrypt.compare(claveActual, user.clave);
      if (!valida) throw new AppError("La clave actual es incorrecta", 400);

      const hash = await bcrypt.hash(claveNueva, 10);
      await usuRepo.update(id, { clave: hash });

      // Forzar cierre de sesión en todos los dispositivos
      await sesRepository.revocarTodas(id);

      await registrarAccion(
        app,
        id,
        "CAMBIAR_CLAVE",
        `El usuario ${user.usuario} cambió su contraseña`,
      );
    },
  };
};

module.exports = authService;
