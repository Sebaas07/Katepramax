import { clienteApi } from "./axiosConfig";

const contabilidadApi = {
  // ── INGRESOS ──────────────────────────────────────────────
  // Backend: GET /ingresos → Admin, Bodega
  obtenerIngresos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/ingresos?${qs}` : "/ingresos");
    return r.data;
  },

  // Backend: POST /ingresos → Admin, Bodega
  registrarIngreso: async (data) => {
    const r = await clienteApi.post("/ingresos", data);
    return r.data;
  },

  // Backend: PATCH /ingresos/:id → Admin, Bodega
  editarIngreso: async (id, data) => {
    const r = await clienteApi.patch(`/ingresos/${id}`, data);
    return r.data;
  },

  // Backend: DELETE /ingresos/:id → solo Admin
  eliminarIngreso: async (id) => {
    const r = await clienteApi.delete(`/ingresos/${id}`);
    return r.data;
  },

  // ── EGRESOS ───────────────────────────────────────────────
  // Backend: GET /egresos → Admin, Bodega
  obtenerEgresos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/egresos?${qs}` : "/egresos");
    return r.data;
  },

  // Backend: POST /egresos → Admin, Bodega
  registrarEgreso: async (data) => {
    const r = await clienteApi.post("/egresos", data);
    return r.data;
  },

  // Backend: PATCH /egresos/:id → Admin, Bodega
  editarEgreso: async (id, data) => {
    const r = await clienteApi.patch(`/egresos/${id}`, data);
    return r.data;
  },

  // Backend: DELETE /egresos/:id → solo Admin
  eliminarEgreso: async (id) => {
    const r = await clienteApi.delete(`/egresos/${id}`);
    return r.data;
  },

  // ── CARTERA ───────────────────────────────────────────────
  // Backend: GET /cartera → Admin, Bodega
  obtenerCartera: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/cartera?${qs}` : "/cartera");
    return r.data;
  },

  // Backend: POST /cartera → Admin, Bodega
  registrarCartera: async (data) => {
    const r = await clienteApi.post("/cartera", data);
    return r.data;
  },

  // Backend: PATCH /cartera/:id → Admin, Bodega
  editarCartera: async (id, data) => {
    const r = await clienteApi.patch(`/cartera/${id}`, data);
    return r.data;
  },

  // Backend: DELETE /cartera/:id → solo Admin
  eliminarCartera: async (id) => {
    const r = await clienteApi.delete(`/cartera/${id}`);
    return r.data;
  },

  // ── ABONOS (Pagos a Proveedores) ─────────────────────────────
  // Backend: GET /abonos → Admin, Bodega
  listarAbonos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/abonos?${qs}` : "/abonos");
    return r.data;
  },

  // Backend: POST /abonos → Admin, Bodega
  registrarPagoProveedor: async (data) => {
    const r = await clienteApi.post("/abonos", data);
    return r.data;
  },

  // Backend: PATCH /abonos/:id → Admin, Bodega
  editarPagoProveedor: async (id, data) => {
    const r = await clienteApi.patch(`/abonos/${id}`, data);
    return r.data;
  },

  // Backend: DELETE /abonos/:id → solo Admin
  eliminarPagoProveedor: async (id) => {
    const r = await clienteApi.delete(`/abonos/${id}`);
    return r.data;
  },

  // Backend: GET /abonos/resumen-proveedor → Admin, Bodega
  obtenerResumenProveedores: async (semana) => {
    const r = await clienteApi.get(
      `/abonos/resumen-proveedor?semana=${semana}`,
    );
    return r.data;
  },

  // ── PROVEEDORES (listado para selector en abonos) ────────────
  // Backend: GET /proveedores → Admin, Bodega
  obtenerProveedores: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/proveedores?${qs}` : "/proveedores");
    return r.data;
  },

  // ── REPORTES ──────────────────────────────────────────────────
  // Backend: GET /reportes/arqueo-semanal?semana=N → solo Admin
  obtenerArqueo: async (semana) => {
    const r = await clienteApi.get(`/reportes/arqueo-semanal?semana=${semana}`);
    return r.data;
  },

  // Backend: GET /reportes/panel-general → Admin, Bodega
  obtenerPanelGeneral: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(
      qs ? `/reportes/panel-general?${qs}` : "/reportes/panel-general",
    );
    return r.data;
  },

  // ── INVENTARIO SEMANAL ────────────────────────────────────────
  // Backend: GET /inventario/resumen-semanal → Admin, Bodega
  obtenerInventarioSemanal: async (semana) => {
    const r = await clienteApi.get(
      `/inventario/resumen-semanal?semana=${semana}`,
    );
    return r.data;
  },
};

export default contabilidadApi;
