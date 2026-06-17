import auditApi from "@/api/auditApi";

const auditService = {
  obtenerLogs: async (filtros = {}) => {
    try {
      return await auditApi.obtenerAuditLogs(filtros);
    } catch {
      return [];
    }
  },

  obtenerUsuarios: async () => {
    try {
      return await auditApi.obtenerUsuariosAudit();
    } catch {
      return [];
    }
  },

  obtenerModulos: async () => {
    try {
      return await auditApi.obtenerModulosDisponibles();
    } catch {
      return [];
    }
  },

  obtenerAcciones: async () => {
    try {
      return await auditApi.obtenerAccionesDisponibles();
    } catch {
      return [];
    }
  },
};

export default auditService;