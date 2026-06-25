import { clienteApi } from "./axiosConfig";

const clientesApi = {
  // TODO: Backend GET /clientes restringido a Admin/Bodega
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

  // TODO: Backend GET /clientes/:id restringido a Admin/Bodega
  obtenerClientePorId: async (id) => {
    const response = await clienteApi.get(`/clientes/${id}`);
    return response.data;
  },

  // TODO: Backend POST /clientes restringido a Admin/Bodega
  crearCliente: async (clienteData) => {
    const response = await clienteApi.post("/clientes", clienteData);
    return response.data;
  },

  // TODO: Backend PATCH /clientes/:id restringido a Admin/Bodega
  actualizarCliente: async (id, clienteData) => {
    const response = await clienteApi.patch(`/clientes/${id}`, clienteData);
    return response.data;
  },

  // TODO: Backend DELETE /clientes/:id restringido a solo Admin
  desactivarCliente: async (id) => {
    const response = await clienteApi.delete(`/clientes/${id}`);
    return response.data;
  },

  abonarCliente: async (id, monto) => {
    const response = await clienteApi.post(`/clientes/${id}/abonar`, { monto });
    return response.data;
  },
};

export default clientesApi;