import { clienteApi } from "./axiosConfig";

/**
 * proveedoresApi.js — Katepramax
 * Llamadas HTTP puras para el módulo de proveedores.
 * Schema real: Proveedor { id, nombre, activo, creadoEn }
 */
const proveedoresApi = {
  obtenerProveedores: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(qs ? `/proveedores?${qs}` : "/proveedores");
    return response.data;
  },

  obtenerProveedorPorId: async (id) => {
    const response = await clienteApi.get(`/proveedores/${id}`);
    return response.data;
  },

  crearProveedor: async (data) => {
    const response = await clienteApi.post("/proveedores", data);
    return response.data;
  },

  actualizarProveedor: async (id, data) => {
    const response = await clienteApi.patch(`/proveedores/${id}`, data);
    return response.data;
  },

  desactivarProveedor: async (id) => {
    const response = await clienteApi.delete(`/proveedores/${id}`);
    return response.data;
  },
};

export default proveedoresApi;
