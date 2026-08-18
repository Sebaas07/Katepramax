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

  // TODO: Backend restringido a Admin/Bodega para crear pedidos
  crearPedido: async (pedidoData) => {
    // body: { clienteId: int, items: [...], observaciones? }
    const response = await clienteApi.post("/pedidos", pedidoData);
    return response.data;
  },

  // TODO: Backend PATCH /pedidos/:id/estado solo para Admin (cancelar)
  actualizarEstadoPedido: async (pedidoId, estado) => {
    const response = await clienteApi.patch(`/pedidos/${pedidoId}/estado`, { estado });
    return response.data;
  },

// Endpoint existe en backend
   asignarEntregador: async (pedidoId, entregadorId) => {
     const response = await clienteApi.post("/asignaciones", {
       pedidoId:     parseInt(pedidoId),
       entregadorId: parseInt(entregadorId),
     });
     return response.data;
   },

   obtenerHistorial: async (pedidoId) => {
     const response = await clienteApi.get(`/pedidos/${pedidoId}/historial`);
     return response.data;
   },

   // Endpoint público (QR de validación de la factura)
   obtenerFactura: async (pedidoId) => {
     const response = await clienteApi.get(`/pedidos/${pedidoId}/factura`);
     return response.data;
   },

  // Endpoint existe en backend
  listarAsignaciones: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(qs ? `/asignaciones?${qs}` : "/asignaciones");
    return response.data;
  },

  // Endpoint GET /usuarios/entregadores — Admin, AdminBogota y Oficinista
  obtenerEntregadores: async () => {
    const response = await clienteApi.get("/usuarios/entregadores");
    return response.data;
  },
};

export default pedidosApi;
