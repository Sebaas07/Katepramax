import { clienteApi } from "@/api/axiosConfig";

/**
 * usuarios.service.js — Katepramax
 * Gestión de usuarios del sistema. Solo Admin.
 *
 * Endpoints disponibles:
 *   GET    /usuarios              — lista todos los usuarios
 *   PATCH  /usuarios/:id          — desactivar usuario
 *   PATCH  /usuarios/:id/activar  — reactivar usuario
 */
const usuariosService = {
  obtenerUsuarios: async () => {
    try {
      const response = await clienteApi.get("/usuarios");
      return response.data;
    } catch (error) {
      console.error("usuariosService.obtenerUsuarios:", error);
      throw error;
    }
  },

  desactivarUsuario: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del usuario.");
      const response = await clienteApi.patch(`/usuarios/${id}`);
      return response.data;
    } catch (error) {
      console.error("usuariosService.desactivarUsuario:", error);
      throw error;
    }
  },

  activarUsuario: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del usuario.");
      const response = await clienteApi.patch(`/usuarios/${id}/activar`);
      return response.data;
    } catch (error) {
      console.error("usuariosService.activarUsuario:", error);
      throw error;
    }
  },
};

export default usuariosService;
