import { clienteApi } from "@/api/axiosConfig";

const auditService = {
  // Backend no tiene /audit-log - método eliminado
  obtenerLogs: async () => [],

  // Backend: GET /usuarios → solo Admin
  obtenerUsuarios: async () => {
    try {
      const { data } = await clienteApi.get("/usuarios");
      return data;
    } catch {
      return [];
    }
  },

  // Backend no tiene /audit-log/modulos - usa valores estáticos
  obtenerModulos: async () => {
    return ["pedidos", "inventario", "clientes", "proveedores", "contabilidad", "usuarios", "auth"];
  },

  // Backend no tiene /audit-log/acciones - usa valores estáticos
  obtenerAcciones: async () => {
    return ["crear", "leer", "actualizar", "eliminar", "login", "logout"];
  },
};

export default auditService;