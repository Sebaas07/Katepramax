import { clienteApi } from "./axiosConfig";

const clientesApi = {
  // GET con query params
  obtenerClientes: async (filtros = {}) => {
    // Convertir filtros a query string
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const url = queryString ? `/clientes?${queryString}` : "/clientes";

    const response = await clienteApi.get(url);
    return response.data;
  },

  obtenerClientePorId: async (id) => {
    const response = await clienteApi.get(`/clientes/${id}`);
    return response.data;
  },

  crearCliente: async (clienteData) => {
    const response = await clienteApi.post("/clientes", clienteData);
    return response.data;
  },

  actualizarCliente: async (id, clienteData) => {
    const response = await clienteApi.patch(`/clientes/${id}`, clienteData);
    return response.data;
  },

  desactivarCliente: async (id) => {
    const response = await clienteApi.delete(`/clientes/${id}`);
    return response.data;
  },
};

export default clientesApi;