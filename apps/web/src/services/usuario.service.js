import usuariosApi from "@/api/usuariosApi";
import { getApiErrorMessage, normalizeArrayResponse } from "@/utils/apiHelpers";

const ROLES_PERMITIDOS = ["Admin", "AdminBogota", "Oficinista", "Bodega", "Entregador"];

// Contraseña: mínimo 5 caracteres, al menos un número y un símbolo
const REGEX_CONTRASENA = /^(?=.*[0-9])(?=.*[^A-Za-z0-9\s]).{5,}$/;

const validarContrasena = (contrasena) => {
  if (!contrasena) {
    throw new Error("La contraseña es obligatoria.");
  }
  if (contrasena.length < 5) {
    throw new Error("La contraseña debe tener al menos 5 caracteres.");
  }
  if (!REGEX_CONTRASENA.test(contrasena)) {
    throw new Error("La contraseña debe incluir al menos un número y un símbolo.");
  }
};

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
      validarContrasena(datos.contrasena);
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
        telefono: datos.telefono ?? "",
        ...(datos.rol === "Entregador" && Array.isArray(datos.sedesIds) && datos.sedesIds.length > 0
          ? { sedesIds: datos.sedesIds.map(Number) }
          : {}),
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
      if (datos.telefono !== undefined) {
        const telefono = String(datos.telefono ?? "").replace(/\D/g, "").slice(0, 10);
        if (telefono && !/^\d{10}$/.test(telefono)) {
          throw new Error("El teléfono debe tener exactamente 10 dígitos.");
        }
        payload.telefono = telefono;
      }
      if (datos.rol !== undefined && datos.rol === "Entregador") {
        if (Array.isArray(datos.sedesIds)) {
          payload.sedesIds = datos.sedesIds.map(Number);
        }
      } else if (datos.sedesIds !== undefined) {
        // Si deja de ser Entregador, se limpian las bodegas extra.
        payload.sedesIds = [];
      }
      if (datos.contrasena) {
        validarContrasena(datos.contrasena);
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
