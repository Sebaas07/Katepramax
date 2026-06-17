import { clienteApi } from "./axiosConfig";

/**
 * inventarioApi.js — Katepramax
 * Versión unificada y mejorada (Sprint 2)
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
    if (!codigo) return null;
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

  // ─── Movimientos de Inventario ──────────────────────────────────────────
  registrarMovimiento: async (datos) => {
    const response = await clienteApi.post("/inventario/movimientos", datos);
    return response.data;
  },

  listarMovimientos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(qs ? `/inventario/movimientos?${qs}` : "/inventario/movimientos");
    return response.data;
  },

  obtenerMovimientoPorId: async (id) => {
    const response = await clienteApi.get(`/inventario/movimientos/${id}`);
    return response.data;
  },

  // ─── Resumen y Stock Bajo ───────────────────────────────────────────────
  resumenSemanal: async (semana) => {
    const response = await clienteApi.get(`/inventario/resumen-semanal?semana=${semana}`);
    return response.data;
  },

  obtenerStockBajo: async () => {
    const response = await clienteApi.get("/inventario/stock-bajo");
    return response.data;
  },
};

export default inventarioApi;