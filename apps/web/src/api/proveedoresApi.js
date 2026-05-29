import { clienteApi } from "./axiosConfig";

const proveedoresApi = {
  obtenerProveedores: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const url = queryString ? `/proveedores?${queryString}` : "/proveedores";

    const response = await clienteApi.get(url);
    return response.data;
  },
  obtenerProveedorPorId: async (id) => {
    const response = await clienteApi.get(`/proveedores/${id}`);
    return response.data;
  },
  crearProveedor: async (proveedorData) => {
    const response = await clienteApi.post("/proveedores", proveedorData);
    return response.data;
  },
  actualizarProveedor: async (id, proveedorData) => {
    const response = await clienteApi.patch(
      `/proveedores/${id}`,
      proveedorData,
    );
    return response.data;
  },
  eliminarProveedor: async (id) => {
    const response = await clienteApi.delete(`/proveedores/${id}`);
    return response.data;
  },
};

export default proveedoresApi;
