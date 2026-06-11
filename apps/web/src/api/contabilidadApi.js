import { clienteApi } from "./axiosConfig";

/**
 * contabilidadApi.js — Katepramax
 *
 * El schema Prisma tiene el modelo Ingreso.
 * El backend aún NO tiene rutas /contabilidad/* implementadas.
 * Todos los métodos fallan silenciosamente (service retorna []).
 *
 * Contratos listos para cuando el backend los implemente:
 *   Ingreso: { fecha, semana, sedeId, efectivo, cuentas, total, observacion? }
 *   Egreso:  { fecha, semana, sedeId, concepto, total, observaciones?, dia? }
 *   Cartera: { fecha, semana, sedeId, saldoDia }
 */
const contabilidadApi = {
  // ── INGRESOS ──────────────────────────────────────────────
  obtenerIngresos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/contabilidad/ingresos?${qs}` : "/contabilidad/ingresos");
    return r.data;
  },

  registrarIngreso: async (data) => {
    const r = await clienteApi.post("/contabilidad/ingresos", data);
    return r.data;
  },

  editarIngreso: async (id, data) => {
    const r = await clienteApi.patch(`/contabilidad/ingresos/${id}`, data);
    return r.data;
  },

  eliminarIngreso: async (id) => {
    const r = await clienteApi.delete(`/contabilidad/ingresos/${id}`);
    return r.data;
  },

  // ── EGRESOS ───────────────────────────────────────────────
  obtenerEgresos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/contabilidad/egresos?${qs}` : "/contabilidad/egresos");
    return r.data;
  },

  registrarEgreso: async (data) => {
    const r = await clienteApi.post("/contabilidad/egresos", data);
    return r.data;
  },

  editarEgreso: async (id, data) => {
    const r = await clienteApi.patch(`/contabilidad/egresos/${id}`, data);
    return r.data;
  },

  eliminarEgreso: async (id) => {
    const r = await clienteApi.delete(`/contabilidad/egresos/${id}`);
    return r.data;
  },

  // ── CARTERA ───────────────────────────────────────────────
  obtenerCartera: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/contabilidad/cartera?${qs}` : "/contabilidad/cartera");
    return r.data;
  },

  registrarCartera: async (data) => {
    const r = await clienteApi.post("/contabilidad/cartera", data);
    return r.data;
  },

  // ── PROVEEDORES ─────────────────────────────────────────────
  obtenerProveedores: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/abonos?${qs}` : "/abonos");
    return r.data;
  },

  registrarPagoProveedor: async (data) => {
    const r = await clienteApi.post("/abonos", data);
    return r.data;
  },

  obtenerResumenProveedores: async (semana) => {
    const r = await clienteApi.get(`/abonos/resumen-proveedor?semana=${semana}`);
    return r.data;
  },

  // ── ARQUEO SEMANAL ────────────────────────────────────────
  obtenerArqueo: async (semana) => {
    const r = await clienteApi.get(`/reportes/arqueo-semanal?semana=${semana}`);
    return r.data;
  },

  obtenerPanelGeneral: async (fecha) => {
    const r = await clienteApi.get(`/reportes/panel-general?fecha=${fecha}`);
    return r.data;
  },

  obtenerInventarioSemanal: async (semana) => {
    const r = await clienteApi.get(`/inventario/resumen-semanal?semana=${semana}`);
    return r.data;
  },
};

export default contabilidadApi;
