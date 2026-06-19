const bcrypt = require("bcrypt");
const usuarioRepo = require("../repositories/usuario.repository");
const { registrarAccion } = require("../utils/logger");
const { AppError } = require("../errors/AppError");

const usuarioService = (app) => {
  const repo = usuarioRepo(app.prisma);

  return {
    getAll: () => repo.findAll(),

    getById: async (id) => {
      const user = await repo.findById(id);
      if (!user) throw new AppError("Usuario no encontrado", 404);
      return user;
    },

    create: async (data, creadoPorId) => {
      const { nombreCompleto, usuario, correo, contrasena, rol, telefono, sedeId } = data;

      const correoNormalizado = correo?.trim() || `${usuario}@katepramax.local`;
      const [existeUsuario, existeCorreo] = await Promise.all([
        repo.findByUsuario(usuario),
        repo.findByCorreo(correoNormalizado),
      ]);

      if (existeUsuario) throw new AppError("El nombre de usuario ya está en uso", 400);
      if (existeCorreo) throw new AppError("El correo ya está registrado", 400);

      const clave = await bcrypt.hash(contrasena, 10);
      const nuevo = await repo.create({
        nombreCompleto,
        usuario,
        correo: correoNormalizado,
        clave,
        rol,
        telefono: telefono ?? "",
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
      if (!existe) throw new AppError("Usuario no encontrado", 404);

      const campos = {};
      const permitidos = ["nombreCompleto", "usuario", "correo", "telefono", "rol", "sedeId", "activo"];
      permitidos.forEach((c) => {
        if (data[c] !== undefined) campos[c] = data[c];
      });

      if (campos.usuario && campos.usuario !== existe.usuario) {
        const usuarioExistente = await repo.findByUsuario(campos.usuario);
        if (usuarioExistente) throw new AppError("El nombre de usuario ya está en uso", 400);
      }

      if (campos.correo) {
        const correoExistente = await repo.findByCorreo(campos.correo);
        if (correoExistente && correoExistente.id !== id) {
          throw new AppError("El correo ya está registrado", 400);
        }
      }

      if (campos.sedeId !== undefined) campos.sedeId = parseInt(campos.sedeId);
      if (campos.activo !== undefined) campos.activo = Boolean(campos.activo);
      if (campos.telefono !== undefined) campos.telefono = campos.telefono ?? "";

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
      if (!existe) throw new AppError("Usuario no encontrado", 404);
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
