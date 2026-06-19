import { clienteApi } from "./axiosConfig";

/**
 * usuariosApi.js — Katepramax
 * Endpoints REST reales del módulo de usuarios.
 */
const usuariosApi = {
  obtenerUsuarios: async () => {
    const response = await clienteApi.get("/usuarios");
    return response.data;
  },

  crearUsuario: async (datos) => {
    const response = await clienteApi.post("/usuarios", datos);
    return response.data;
  },

  actualizarUsuario: async (id, datos) => {
    const response = await clienteApi.put(`/usuarios/${id}`, datos);
    return response.data;
  },

  desactivarUsuario: async (id) => {
    const response = await clienteApi.patch(`/usuarios/${id}`);
    return response.data;
  },

  activarUsuario: async (id) => {
    const response = await clienteApi.patch(`/usuarios/${id}/activar`);
    return response.data;
  },
};

export default usuariosApi;
