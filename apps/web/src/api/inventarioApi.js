import { clienteApi } from "./axiosConfig";

/**
 * inventarioApi.js — Katepramax
 * Alineado con los endpoints reales del backend.
 */

const inventarioApi = {
  // ─── Productos ────────────────────────────────────────────────────────────
  // Backend: GET /productos → Admin, Bodega
  obtenerProductos: async (filtros = {}) => {
    const response = await clienteApi.get("/productos", { params: filtros });
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
    const response = await clienteApi.get("/inventario", { params: filtros });
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
    const response = await clienteApi.get("/inventario/resumen-semanal", { params: { semana } });
    return response.data;
  },

  // Backend: GET /inventario/deuda-proveedores → Admin, Bodega
  // Devuelve el saldo (deuda − abonos) por proveedor.
  deudaProveedores: async (filtros = {}) => {
    const response = await clienteApi.get("/inventario/deuda-proveedores", { params: filtros });
    return response.data;
  },

  // Backend: GET /inventario/historial-proveedor/:proveedorId → Admin, Bodega
  // Historial de entradas de inventario de un proveedor con resumen y saldos.
  historialProveedor: async (proveedorId, filtros = {}) => {
    const response = await clienteApi.get(`/inventario/historial-proveedor/${proveedorId}`, { params: filtros });
    return response.data;
  },

  // Backend: GET /productos?stockBajo=true → Admin, Bodega
  obtenerStockBajo: async () => {
    const response = await clienteApi.get("/productos", { params: { stockBajo: true, activo: true } });
    return response.data;
  },

  // Backend: GET /sedes → Admin, Bodega
  obtenerSedes: async () => {
    const response = await clienteApi.get("/sedes");
    return response.data;
  },
};

export default inventarioApi;
