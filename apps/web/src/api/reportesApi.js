import { clienteApi } from "./axiosConfig";

/**
 * reportesApi.js — Katepramax
 * Sprint 5 — endpoints del módulo de reportes.
 * Centraliza las llamadas HTTP puras.
 */

const buildParams = (filtros = {}) => {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.append(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

const reportesApi = {
  // ─── Resumen general ───────────────────────────────────────────────────
  obtenerResumenGeneral: async (filtros = {}) => {
    const qs = buildParams(filtros);
    const { data } = await clienteApi.get(`/reportes/resumen-general${qs}`);
    return data;
  },

  // ─── Ventas por período ────────────────────────────────────────────────
  obtenerVentasPorPeriodo: async (filtros = {}) => {
    const qs = buildParams(filtros);
    const { data } = await clienteApi.get(`/reportes/ventas-periodo${qs}`);
    return data;
  },

  // ─── Corte de caja ─────────────────────────────────────────────────────
  obtenerCorteCaja: async (filtros = {}) => {
    const qs = buildParams(filtros);
    const { data } = await clienteApi.get(`/reportes/corte-caja${qs}`);
    return data;
  },

  // ─── Cobros por entregador ─────────────────────────────────────────────
  obtenerCobrosEntregador: async (filtros = {}) => {
    const qs = buildParams(filtros);
    const { data } = await clienteApi.get(`/reportes/cobros-entregador${qs}`);
    return data;
  },

  // ─── Stock bajo ────────────────────────────────────────────────────────
  obtenerStockBajo: async (filtros = {}) => {
    const qs = buildParams(filtros);
    const { data } = await clienteApi.get(`/reportes/stock-bajo${qs}`);
    return data;
  },

  // ─── Deuda clientes ────────────────────────────────────────────────────
  obtenerDeudaClientes: async (filtros = {}) => {
    const qs = buildParams(filtros);
    const { data } = await clienteApi.get(`/reportes/deuda-clientes${qs}`);
    return data;
  },

  // ─── KPIs del día (ya existía) ─────────────────────────────────────────
  obtenerResumenDia: async (sedeId) => {
    const params = sedeId ? `?sedeId=${sedeId}` : "";
    const { data } = await clienteApi.get(`/reportes/resumen-dia${params}`);
    return data;
  },

  obtenerUltimosPedidos: async (sedeId, limite = 5) => {
    const params = new URLSearchParams({ limite });
    if (sedeId) params.append("sedeId", sedeId);
    const { data } = await clienteApi.get(`/pedidos?${params}`);
    return data;
  },
};

export default reportesApi;
