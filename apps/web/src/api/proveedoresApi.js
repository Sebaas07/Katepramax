import { clienteApi } from "./axiosConfig";

const proveedoresApi = {
  // TODO: Backend GET /proveedores restringido a Admin/Bodega
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

  // TODO: Backend GET /proveedores/:id restringido a Admin/Bodega
  obtenerProveedorPorId: async (id) => {
    const response = await clienteApi.get(`/proveedores/${id}`);
    return response.data;
  },

  // TODO: Backend POST /proveedores restringido a solo Admin
  crearProveedor: async (proveedorData) => {
    const response = await clienteApi.post("/proveedores", proveedorData);
    return response.data;
  },

  // TODO: Backend PATCH /proveedores/:id restringido a solo Admin
  actualizarProveedor: async (id, proveedorData) => {
    const response = await clienteApi.patch(
      `/proveedores/${id}`,
      proveedorData,
    );
    return response.data;
  },

  // TODO: Backend DELETE /proveedores/:id restringido a solo Admin
  eliminarProveedor: async (id) => {
    const response = await clienteApi.delete(`/proveedores/${id}`);
    return response.data;
  },
};

export default proveedoresApi;
