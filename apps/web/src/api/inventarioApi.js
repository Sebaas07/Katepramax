import { clienteApi } from "./axiosConfig";

const inventarioApi = {
  obtenerProductos: async () => {
    const response = await clienteApi.get("/productos");
    return response.data;
  },
  
  obtenerProductoPorId: async (id) => {
    const response = await clienteApi.get(`/productos/${id}`);
    return response.data;
  },
  
  obtenerMovimientos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });
    
    const queryString = params.toString();
    const url = queryString ? `/inventario/movimientos?${queryString}` : "/inventario/movimientos";
    
    const response = await clienteApi.get(url);
    return response.data;
  },
  
  crearMovimiento: async (movimientoData) => {
    const response = await clienteApi.post("/inventario/movimientos", movimientoData);
    return response.data;
  },
  
  obtenerStock: async (productoId, sedeId) => {
    const response = await clienteApi.get(`/inventario/stock`, {
      params: { productoId, sedeId }
    });
    return response.data;
  }
};

export default inventarioApi;