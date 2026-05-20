import { clienteApi } from "./axiosConfig";

const pedidosApi = {
  // GET con query params, no POST
  obtenerPedidos: async (filtros = {}) => {
    // Convertir filtros a query string
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        params.append(key, value);
      }
    });

    const queryString = params.toString();
    const url = queryString ? `/pedidos?${queryString}` : "/pedidos";

    const response = await clienteApi.get(url);
    return response.data;
  },

  crearPedido: async (pedidoData) => {
    const response = await clienteApi.post("/pedidos", pedidoData);
    return response.data;
  },

  // Crear asignación - endpoint correcto POST /asignaciones
  asignarEntregador: async (pedidoId, entregadorId) => {
    const response = await clienteApi.post("/asignaciones", {
      pedidoId,
      entregadorId,
    });
    return response.data;
  },

  obtenerEntregadoresDisponibles: async () => {
    const response = await clienteApi.get("/entregadores/disponibles");
    return response.data;
  },

  actualizarEstadoPedido: async (pedidoId, estado) => {
    const response = await clienteApi.patch(`/pedidos/${pedidoId}/estado`, {
      estado,
    });
    return response.data;
  },
};

export default pedidosApi;
