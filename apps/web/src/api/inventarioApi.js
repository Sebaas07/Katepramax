import { clienteApi } from "./axiosConfig";

/**
 * inventarioApi.js — Katepramax
 * Alineado con los endpoints reales del backend.
 */

const inventarioApi = {
  // ─── Productos ────────────────────────────────────────────────────────────
  // Backend: GET /productos → Admin, Bodega
  obtenerProductos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(qs ? `/productos?${qs}` : "/productos");
    return response.data;
  },

  // Backend: GET /productos/:codigo → Admin, Bodega
  obtenerProductoPorCodigo: async (codigo) => {
    if (!codigo) return null;
    const response = await clienteApi.get(`/productos/${codigo}`);
    return response.data;
  },

  // Backend: POST /productos → solo Admin
  crearProducto: async (datos) => {
    const response = await clienteApi.post("/productos", datos);
    return response.data;
  },

  // Backend: PATCH /productos/:codigo → Admin, Bodega
  actualizarProducto: async (codigo, datos) => {
    const response = await clienteApi.patch(`/productos/${codigo}`, datos);
    return response.data;
  },

  // Backend: DELETE /productos/:codigo → solo Admin
  desactivarProducto: async (codigo) => {
    const response = await clienteApi.delete(`/productos/${codigo}`);
    return response.data;
  },

  // ─── Inventario (Entradas Diarias) ───────────────────────────────────────
  // Backend: POST /inventario → Admin, Bodega
  crearEntradaDiaria: async (datos) => {
    const response = await clienteApi.post("/inventario", datos);
    return response.data;
  },

  // Backend: GET /inventario → Admin, Bodega
  listarInventario: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(qs ? `/inventario?${qs}` : "/inventario");
    return response.data;
  },

  // Backend: GET /inventario/:id → Admin, Bodega
  obtenerInventarioPorId: async (id) => {
    const response = await clienteApi.get(`/inventario/${id}`);
    return response.data;
  },

  // Backend: PATCH /inventario/:id → Admin, Bodega
  editarInventario: async (id, datos) => {
    const response = await clienteApi.patch(`/inventario/${id}`, datos);
    return response.data;
  },

  // Backend: DELETE /inventario/:id → solo Admin
  eliminarInventario: async (id) => {
    const response = await clienteApi.delete(`/inventario/${id}`);
    return response.data;
  },

  // ─── Resumen ────────────────────────────────────────────────────────────
  // Backend: GET /inventario/resumen-semanal → Admin, Bodega
  resumenSemanal: async (semana) => {
    const response = await clienteApi.get(`/inventario/resumen-semanal?semana=${semana}`);
    return response.data;
  },

  // Backend: GET /productos?stockBajo=true → Admin, Bodega
  obtenerStockBajo: async () => {
    const response = await clienteApi.get("/productos?stockBajo=true&activo=true");
    return response.data;
  },
};

export default inventarioApi;