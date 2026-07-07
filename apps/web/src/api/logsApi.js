import { clienteApi } from "./axiosConfig";

const buildParams = (filtros = {}) => {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") params.append(k, v);
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
};

const logsApi = {
  // Backend: GET /logs?usuarioId&accion&fechaInicio&fechaFin&skip&take → Admin
  listarLogs: async (filtros = {}) => {
    const { data } = await clienteApi.get(`/logs${buildParams(filtros)}`);
    return data;
  },

  // Backend: GET /logs/acciones → Admin
  listarAcciones: async () => {
    const { data } = await clienteApi.get("/logs/acciones");
    return data;
  },
};

export default logsApi;
