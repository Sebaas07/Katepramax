import { clienteApi } from "./axiosConfig";

const contabilidadApi = {
  // ── INGRESOS ──────────────────────────────────────────────
  obtenerIngresos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/ingresos?${qs}` : "/ingresos");
    return r.data;
  },

  registrarIngreso: async (data) => {
    const r = await clienteApi.post("/ingresos", data);
    return r.data;
  },

  editarIngreso: async (id, data) => {
    const r = await clienteApi.patch(`/ingresos/${id}`, data);
    return r.data;
  },

  eliminarIngreso: async (id) => {
    const r = await clienteApi.delete(`/ingresos/${id}`);
    return r.data;
  },

  // ── EGRESOS ───────────────────────────────────────────────
  obtenerEgresos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/egresos?${qs}` : "/egresos");
    return r.data;
  },

  registrarEgreso: async (data) => {
    const r = await clienteApi.post("/egresos", data);
    return r.data;
  },

  editarEgreso: async (id, data) => {
    const r = await clienteApi.patch(`/egresos/${id}`, data);
    return r.data;
  },

  eliminarEgreso: async (id) => {
    const r = await clienteApi.delete(`/egresos/${id}`);
    return r.data;
  },

  // ── CARTERA ───────────────────────────────────────────────
  obtenerCartera: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/cartera?${qs}` : "/cartera");
    return r.data;
  },

  registrarCartera: async (data) => {
    const r = await clienteApi.post("/contabilidad/cartera", data);
    return r.data;
  },

  editarCartera: async (id, data) => {
    const r = await clienteApi.patch(`/contabilidad/cartera/${id}`, data);
    return r.data;
  },

  eliminarCartera: async (id) => {
    const r = await clienteApi.delete(`/contabilidad/cartera/${id}`);
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

  editarPagoProveedor: async (id, data) => {
    const r = await clienteApi.patch(`/abonos/${id}`, data);
    return r.data;
  },

  eliminarPagoProveedor: async (id) => {
    const r = await clienteApi.delete(`/abonos/${id}`);
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
