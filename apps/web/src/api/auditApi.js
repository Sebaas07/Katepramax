import { clienteApi } from "./axiosConfig";

const auditApi = {
  obtenerAuditLogs: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const r = await clienteApi.get(qs ? `/audit-log?${qs}` : "/audit-log");
    return r.data;
  },

  obtenerUsuariosAudit: async () => {
    const r = await clienteApi.get("/usuarios?limit=100");
    return r.data;
  },

  obtenerModulosDisponibles: async () => {
    const r = await clienteApi.get("/audit-log/modulos");
    return r.data;
  },

  obtenerAccionesDisponibles: async () => {
    const r = await clienteApi.get("/audit-log/acciones");
    return r.data;
  },
};

export default auditApi;