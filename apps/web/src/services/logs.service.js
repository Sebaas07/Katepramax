import logsApi from "@/api/logsApi";

const logsService = {
  listar: async (filtros = {}) => {
    try {
      const data = await logsApi.listarLogs(filtros);
      return {
        total: Number(data?.total ?? 0),
        skip: Number(data?.skip ?? 0),
        take: Number(data?.take ?? 50),
        data: Array.isArray(data?.data) ? data.data : [],
      };
    } catch (error) {
      console.error("logsService.listar:", error);
      throw error;
    }
  },

  listarAcciones: async () => {
    try {
      const data = await logsApi.listarAcciones();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("logsService.listarAcciones:", error);
      return [];
    }
  },
};

export default logsService;
