import { clienteApi } from "./axiosConfig";

/**
 * envioApi.js — Katepramax
 * Guías de envío de mercancía entre sedes.
 */

const envioApi = {
  // Backend: POST /envios → Admin, AdminBogota
  crearEnvio: async (payload) => {
    const { data } = await clienteApi.post("/envios", payload);
    return data;
  },

  // Backend: GET /envios?direccion&estado&sedeId&skip&take → Admin, Bodega, AdminBogota
  obtenerEnvios: async (filtros = {}) => {
    const { data } = await clienteApi.get("/envios", { params: filtros });
    return data;
  },

  // Backend: GET /envios/pendientes-count → Admin, Bodega, AdminBogota
  obtenerPendientesCount: async () => {
    const { data } = await clienteApi.get("/envios/pendientes-count");
    return data;
  },

  // Backend: GET /envios/:id → Admin, Bodega, AdminBogota
  obtenerEnvioPorId: async (id) => {
    const { data } = await clienteApi.get(`/envios/${id}`);
    return data;
  },

  // Backend: PATCH /envios/:id/confirmar → Admin, Bodega, AdminBogota
  confirmarEnvio: async (id, payload) => {
    const { data } = await clienteApi.patch(`/envios/${id}/confirmar`, payload);
    return data;
  },
};

export default envioApi;
