const bcrypt = require("bcrypt");
const usuarioRepo = require("../repositories/usuario.repository");
const { registrarAccion } = require("../utils/logger");

const usuarioService = (app) => {
  const repo = usuarioRepo(app.prisma);

  return {
    getAll: () => repo.findAll(),

    getById: async (id) => {
      const user = await repo.findById(id);
      if (!user) {
        const err = new Error("Usuario no encontrado");
        err.statusCode = 404;
        throw err;
      }
      return user;
    },

    create: async (data, creadoPorId) => {
      const {
        nombreCompleto,
        usuario,
        correo,
        contrasena,
        rol,
        telefono,
        sedeId,
      } = data;

      const [existeUsuario, existeCorreo] = await Promise.all([
        repo.findByUsuario(usuario),
        repo.findByCorreo(correo),
      ]);

      if (existeUsuario) {
        const err = new Error("El nombre de usuario ya está en uso");
        err.statusCode = 400;
        throw err;
      }
      if (existeCorreo) {
        const err = new Error("El correo ya está registrado");
        err.statusCode = 400;
        throw err;
      }

      const clave = await bcrypt.hash(contrasena, 10);
      const nuevo = await repo.create({
        nombreCompleto,
        usuario,
        correo,
        clave,
        rol,
        telefono,
        sedeId: parseInt(sedeId),
      });

      await registrarAccion(
        app,
        creadoPorId,
        "CREAR_USUARIO",
        `Usuario creado: ${nuevo.usuario} (${nuevo.rol})`,
      );
      return {
        id: nuevo.id,
        nombreCompleto: nuevo.nombreCompleto,
        usuario: nuevo.usuario,
        rol: nuevo.rol,
        sedeId: nuevo.sedeId,
      };
    },

    update: async (id, data, actualizadoPorId) => {
      const existe = await repo.findById(id);
      if (!existe) {
        const err = new Error("Usuario no encontrado");
        err.statusCode = 404;
        throw err;
      }

      const campos = {};
      const permitidos = ["nombreCompleto", "correo", "telefono", "rol"];
      permitidos.forEach((c) => {
        if (data[c] !== undefined) campos[c] = data[c];
      });

      if (data.contrasena) {
        campos.clave = await bcrypt.hash(data.contrasena, 10);
      }

      const actualizado = await repo.update(id, campos);
      await registrarAccion(
        app,
        actualizadoPorId,
        "ACTUALIZAR_USUARIO",
        `Usuario actualizado: ${actualizado.usuario}`,
      );
      return actualizado;
    },

    setActivo: async (id, activo, accionadoPorId) => {
      const existe = await repo.findById(id);
      if (!existe) {
        const err = new Error("Usuario no encontrado");
        err.statusCode = 404;
        throw err;
      }
      const resultado = await repo.setActivo(id, activo);
      const accion = activo ? "ACTIVAR_USUARIO" : "DESACTIVAR_USUARIO";
      await registrarAccion(
        app,
        accionadoPorId,
        accion,
        `Usuario ${activo ? "activado" : "desactivado"}: ${resultado.usuario}`,
      );
      return resultado;
    },
  };
};

module.exports = usuarioService;
