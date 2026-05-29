import { clienteApi } from "./axiosConfig";

/**
 * inventarioApi.js — Katepramax
 * Alineado con los endpoints reales del backend.
 */
const inventarioApi = {
  obtenerProductos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(qs ? `/productos?${qs}` : "/productos");
    return response.data;
  },

  obtenerProductoPorCodigo: async (codigo) => {
    const response = await clienteApi.get(`/productos/${codigo}`);
    return response.data;
  },

  crearEntrada: async (datos) => {
    const response = await clienteApi.post("/inventario", datos);
    return response.data;
  },

  listarEntradas: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(qs ? `/inventario?${qs}` : "/inventario");
    return response.data;
  },

  obtenerEntradaPorId: async (id) => {
    const response = await clienteApi.get(`/inventario/${id}`);
    return response.data;
  },

  editarEntrada: async (id, datos) => {
    const response = await clienteApi.patch(`/inventario/${id}`, datos);
    return response.data;
  },

  eliminarEntrada: async (id) => {
    const response = await clienteApi.delete(`/inventario/${id}`);
    return response.data;
  },

  resumenSemanal: async (semana) => {
    const response = await clienteApi.get(`/inventario/resumen-semanal?semana=${semana}`);
    return response.data;
  },
};

export default inventarioApi;
