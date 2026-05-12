const bcrypt = require("bcrypt");
const usuarioRepo = require("../repositories/usuario.repository");
const { registrarAccion } = require("../utils/logger");
const { AppError } = require("../errors/AppError");

const authService = (app) => {
  const repo = usuarioRepo(app.prisma);

  return {
    login: async (usuario, contrasena) => {
      const user = await repo.findByUsuario(usuario);

      if (!user || !user.activo)
        throw new AppError("Usuario no encontrado o inactivo", 401);

      const valida = await bcrypt.compare(contrasena, user.clave);
      if (!valida) throw new AppError("Contraseña incorrecta", 401);

      const token = app.jwt.sign(
        { id: user.id, usuario: user.usuario, rol: user.rol, sedeId: user.sedeId },
        { expiresIn: "1d" },
      );

      // Actualizar último acceso en background — no bloquea la respuesta
      repo.updateUltimoAcceso(user.id).catch(() => {});
      await registrarAccion(app, user.id, "LOGIN", `Inicio de sesión: ${user.usuario}`);

      return {
        token,
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

    me: async (id) => {
      const user = await repo.findById(id);
      if (!user) throw new AppError("Usuario no encontrado", 404);
      return user;
    },

    cambiarClave: async (id, claveActual, claveNueva) => {
      const user = await app.prisma.usuario.findUnique({ where: { id } });
      if (!user) throw new AppError("Usuario no encontrado", 404);

      const valida = await bcrypt.compare(claveActual, user.clave);
      if (!valida) throw new AppError("La clave actual es incorrecta", 400);

      const hash = await bcrypt.hash(claveNueva, 10);
      await repo.update(id, { clave: hash });
      await registrarAccion(app, id, "CAMBIAR_CLAVE", `El usuario ${user.usuario} cambió su contraseña`);
    },
  };
};

module.exports = authService;
