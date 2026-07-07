import { clienteApi } from "./axiosConfig";

/**
 * reportesApi.js — Katepramax
 * Endpoints alineados con el backend.
 */

const buildParams = (filtros = {}) => {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.append(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

const normalizarPanelGeneral = (filtros = {}) => {
  const fecha = filtros.fecha ?? filtros.fechaInicio ?? filtros.fechaFin;
  const resultado = fecha ? { fecha } : {};
  if (filtros.sedeId) resultado.sedeId = filtros.sedeId;
  return resultado;
};

const reportesApi = {
  // Backend: GET /reportes/arqueo-semanal → solo Admin
  obtenerArqueo: async (filtros = {}) => {
    const qs = buildParams(filtros);
    const { data } = await clienteApi.get(`/reportes/arqueo-semanal${qs}`);
    return data;
  },

  // Backend: GET /reportes/panel-general → Admin, Bodega
  obtenerPanelGeneral: async (filtros = {}) => {
    const qs = buildParams(normalizarPanelGeneral(filtros));
    const { data } = await clienteApi.get(`/reportes/panel-general${qs}`);
    return data;
  },

  // Backend: GET /reportes/historial-semanal → solo Admin
  obtenerHistorialSemanal: async () => {
    const { data } = await clienteApi.get("/reportes/historial-semanal");
    return data;
  },

  // Backend: GET /reportes/cobros-entregador?fechaInicio&fechaFin&sedeId → Admin, Bodega
  obtenerCobrosEntregador: async (filtros = {}) => {
    const qs = buildParams(filtros);
    const { data } = await clienteApi.get(`/reportes/cobros-entregador${qs}`);
    return data;
  },
};

export default reportesApi;