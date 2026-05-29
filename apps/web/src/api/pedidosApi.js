import { clienteApi } from "./axiosConfig";

/**
 * pedidosApi.js — Katepramax
 * Alineado con los contratos reales del backend.
 * Estados válidos: Pendiente | Asignado | Entregado | Cancelado (mayúscula inicial)
 */
const pedidosApi = {
  obtenerPedidos: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(qs ? `/pedidos?${qs}` : "/pedidos");
    return response.data;
  },

  obtenerPedidoPorId: async (id) => {
    const response = await clienteApi.get(`/pedidos/${id}`);
    return response.data;
  },

  crearPedido: async (pedidoData) => {
    // body: { clienteId: int, items: [...], observaciones? }
    const response = await clienteApi.post("/pedidos", pedidoData);
    return response.data;
  },

  actualizarEstadoPedido: async (pedidoId, estado) => {
    const response = await clienteApi.patch(`/pedidos/${pedidoId}/estado`, { estado });
    return response.data;
  },

  asignarEntregador: async (pedidoId, entregadorId) => {
    const response = await clienteApi.post("/asignaciones", {
      pedidoId:     parseInt(pedidoId),
      entregadorId: parseInt(entregadorId),
    });
    return response.data;
  },

  listarAsignaciones: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(qs ? `/asignaciones?${qs}` : "/asignaciones");
    return response.data;
  },

  obtenerEntregadores: async () => {
    const response = await clienteApi.get("/usuarios");
    return response.data.filter(u => u.rol === "Entregador");
  },
};

export default pedidosApi;
