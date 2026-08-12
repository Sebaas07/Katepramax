import { clienteApi } from "./axiosConfig";

/**
 * sedesApi.js — Katepramax
 * Endpoints del módulo de sedes / sucursales.
 * GET /sedes → cualquier rol autenticado
 * POST /sedes → solo Admin
 * PATCH /sedes/:id → solo Admin (renombrar / activar-desactivar)
 */

const sedesApi = {
  obtenerSedes: async () => {
    const response = await clienteApi.get("/sedes");
    return response.data;
  },

  crearSede: async (datos) => {
    const response = await clienteApi.post("/sedes", datos);
    return response.data;
  },

  actualizarSede: async (id, datos) => {
    const response = await clienteApi.patch(`/sedes/${id}`, datos);
    return response.data;
  },
};

export default sedesApi;