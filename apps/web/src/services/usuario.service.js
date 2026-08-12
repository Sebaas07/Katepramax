import usuariosApi from "@/api/usuariosApi";
import { getApiErrorMessage, normalizeArrayResponse } from "@/utils/apiHelpers";

const ROLES_PERMITIDOS = ["Admin", "AdminBogota", "Oficinista", "Bodega", "Entregador"];

const limpiarTexto = (valor) => String(valor ?? "").trim();

const validarRol = (rol) => {
  if (!ROLES_PERMITIDOS.includes(rol)) {
    throw new Error("Selecciona un rol válido.");
  }
};

const validarSedeId = (sedeId) => {
  const numero = Number(sedeId);
  if (!Number.isInteger(numero) || numero < 1) {
    throw new Error("Selecciona una sede válida.");
  }
  return numero;
};

const usuarioService = {
  obtenerUsuarios: async () => {
    try {
      const data = await usuariosApi.obtenerUsuarios();
      return normalizeArrayResponse(data);
    } catch (error) {
      console.error("usuarioService.obtenerUsuarios:", error);
      throw new Error(getApiErrorMessage(error), { cause: error });
    }
  },

  crearUsuario: async (datos) => {
    try {
      const nombreCompleto = limpiarTexto(datos.nombreCompleto);
      const usuario = limpiarTexto(datos.usuario);

      if (!nombreCompleto) throw new Error("El nombre completo es obligatorio.");
      if (!usuario) throw new Error("El nombre de usuario es obligatorio.");
      if (!/^[a-zA-Z0-9_]{5,50}$/.test(usuario)) {
        throw new Error("El usuario debe tener 5 a 50 caracteres, solo letras, números y guión bajo.");
      }
      if (!datos.rol) throw new Error("Selecciona un rol.");
      validarRol(datos.rol);
      validarSedeId(datos.sedeId);
      if (!datos.contrasena || datos.contrasena.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres.");
      }
      if (datos.contrasena !== datos.confirmarContrasena) {
        throw new Error("La confirmación de contraseña no coincide.");
      }

      return await usuariosApi.crearUsuario({
        nombreCompleto,
        usuario,
        contrasena: datos.contrasena,
        rol: datos.rol,
        sedeId: validarSedeId(datos.sedeId),
        activo: datos.activo ?? true,
        telefono: "",
      });
    } catch (error) {
      console.error("usuarioService.crearUsuario:", error);
      throw error;
    }
  },

  actualizarUsuario: async (id, datos) => {
    try {
      if (!id) throw new Error("Se requiere el ID del usuario.");

      const payload = {};
      if (datos.nombreCompleto !== undefined) {
        payload.nombreCompleto = limpiarTexto(datos.nombreCompleto);
        if (!payload.nombreCompleto) throw new Error("El nombre completo es obligatorio.");
      }
      if (datos.usuario !== undefined) {
        payload.usuario = limpiarTexto(datos.usuario);
        if (!/^[a-zA-Z0-9_]{5,50}$/.test(payload.usuario)) {
          throw new Error("El usuario debe tener 5 a 50 caracteres, solo letras, números y guión bajo.");
        }
      }
      if (datos.rol !== undefined) {
        validarRol(datos.rol);
        payload.rol = datos.rol;
      }
      if (datos.sedeId !== undefined) {
        payload.sedeId = validarSedeId(datos.sedeId);
      }
      if (datos.activo !== undefined) {
        payload.activo = Boolean(datos.activo);
      }
      if (datos.contrasena && datos.contrasena.length >= 6) {
        if (datos.contrasena !== datos.confirmarContrasena) {
          throw new Error("La confirmación de contraseña no coincide.");
        }
        payload.contrasena = datos.contrasena;
      }

      return await usuariosApi.actualizarUsuario(id, payload);
    } catch (error) {
      console.error("usuarioService.actualizarUsuario:", error);
      throw error;
    }
  },

  desactivarUsuario: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del usuario.");
      return await usuariosApi.desactivarUsuario(id);
    } catch (error) {
      console.error("usuarioService.desactivarUsuario:", error);
      throw new Error(getApiErrorMessage(error), { cause: error });
    }
  },

  activarUsuario: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del usuario.");
      return await usuariosApi.activarUsuario(id);
    } catch (error) {
      console.error("usuarioService.activarUsuario:", error);
      throw new Error(getApiErrorMessage(error), { cause: error });
    }
  },
};

export default usuarioService;
