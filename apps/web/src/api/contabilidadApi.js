import { clienteApi } from "./axiosConfig";

/**
 * contabilidadApi.js — Katepramax
 * Endpoints de contabilidad. El backend aún no tiene estas rutas implementadas
 * (no existen en /routes). Se dejan preparados para cuando las tenga.
 * El schema Prisma sí tiene el modelo Ingreso.
 *
 * Contratos basados en el Excel real y el modelo Prisma:
 *
 * Ingreso: { fecha, semana, sedeId, efectivo, cuentas, total, observacion? }
 * Egreso:  { fecha, semana, sedeId, concepto, total, observaciones?, dia? }
 * Cartera: { fecha, semana, sedeId, saldoDia }
 */
const contabilidadApi = {
  // ── INGRESOS ────────────────────────────────────────────────
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
    // data: { fecha, semana, sedeId, efectivo, cuentas, total, observacion? }
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

  // ── EGRESOS ─────────────────────────────────────────────────
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
    // data: { fecha, semana, sedeId, concepto, total, observaciones?, dia? }
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

  // ── CARTERA ─────────────────────────────────────────────────
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
    // data: { fecha, semana, sedeId, saldoDia }
    // El backend calcula variación vs registro anterior automáticamente
    const r = await clienteApi.post("/contabilidad/cartera", data);
    return r.data;
  },

  // ── ARQUEO SEMANAL ───────────────────────────────────────────
  obtenerArqueo: async (semana) => {
    // Devuelve los 6 bloques del arqueo consolidado por sede
    const r = await clienteApi.get(`/contabilidad/arqueo?semana=${semana}`);
    return r.data;
  },

  // ── PANEL GENERAL (resumen del día) ──────────────────────────
  obtenerPanelGeneral: async (fecha) => {
    const params = fecha ? `?fecha=${fecha}` : "";
    const r = await clienteApi.get(`/contabilidad/panel${params}`);
    return r.data;
  },
};

export default contabilidadApi;
