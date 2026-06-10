import { clienteApi } from "./axiosConfig";

/**
 * inventarioApi.js — Katepramax
 * Alineado con los endpoints reales del backend.
 * Soporta CRUD de productos y movimientos de inventario.
 */
const inventarioApi = {
  // ─── Productos ────────────────────────────────────────────────────────────
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

  crearProducto: async (datos) => {
    const response = await clienteApi.post("/productos", datos);
    return response.data;
  },

  actualizarProducto: async (codigo, datos) => {
    const response = await clienteApi.patch(`/productos/${codigo}`, datos);
    return response.data;
  },

  desactivarProducto: async (codigo) => {
    const response = await clienteApi.delete(`/productos/${codigo}`);
    return response.data;
  },

  // ─── Entradas de Inventario ─────────────────────────────────────────────
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

  // ─── Movimientos de Inventario ──────────────────────────────────────────
  crearMovimiento: async (datos) => {
    const response = await clienteApi.post("/movimientos", datos);
    return response.data;
  },

  listarMovimientos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(qs ? `/movimientos?${qs}` : "/movimientos");
    return response.data;
  },

  obtenerMovimientoPorId: async (id) => {
    const response = await clienteApi.get(`/movimientos/${id}`);
    return response.data;
  },

  // ─── Resumen ────────────────────────────────────────────────────────────
  resumenSemanal: async (semana) => {
    const response = await clienteApi.get(`/inventario/resumen-semanal?semana=${semana}`);
    return response.data;
  },

  // Productos con stock bajo
  obtenerStockBajo: async () => {
    const response = await clienteApi.get("/productos?stockBajo=true&activo=true");
    return response.data;
  },
};

export default inventarioApi;