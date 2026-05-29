import { clienteApi } from "./axiosConfig";

/**
 * reportesApi.js — Katepramax
 * Llamadas HTTP puras para el módulo de reportes y KPIs del Dashboard.
 */
const reportesApi = {
  // KPIs del día — pedidos, entregas, ingresos, stock bajo
  obtenerResumenDia: async (sedeId) => {
    const params = sedeId ? `?sedeId=${sedeId}` : "";
    const response = await clienteApi.get(`/reportes/resumen-dia${params}`);
    return response.data;
  },

  // Últimos pedidos para la tabla del dashboard
  obtenerUltimosPedidos: async (sedeId, limite = 5) => {
    const params = new URLSearchParams({ limite });
    if (sedeId) params.append("sedeId", sedeId);
    const response = await clienteApi.get(`/pedidos?${params}`);
    return response.data;
  },

  // Cobros por entregador
  obtenerCobrosEntregador: async (fecha) => {
    const params = fecha ? `?fecha=${fecha}` : "";
    const response = await clienteApi.get(`/reportes/cobros-entregador${params}`);
    return response.data;
  },

  // Productos con stock crítico
  obtenerStockBajo: async (sedeId) => {
    const params = sedeId ? `?sedeId=${sedeId}` : "";
    const response = await clienteApi.get(`/reportes/stock-bajo${params}`);
    return response.data;
  },

  // Cartera con saldo pendiente
  obtenerDeudaClientes: async (sedeId) => {
    const params = sedeId ? `?sedeId=${sedeId}` : "";
    const response = await clienteApi.get(`/reportes/deuda-clientes${params}`);
    return response.data;
  },
};

export default reportesApi;
