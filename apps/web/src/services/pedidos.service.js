import pedidosApi from "@/api/pedidosApi";

const pedidosService = {
  obtenerPedidos: async (filtros = {}) => {
    try {
      const f = { ...filtros };
      if (f.estado) f.estado = f.estado.charAt(0).toUpperCase() + f.estado.slice(1).toLowerCase();
      return await pedidosApi.obtenerPedidos(f);
    } catch (e) { console.error("pedidosService.obtenerPedidos:", e); throw e; }
  },
  obtenerPedidoPorId: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del pedido.");
      return await pedidosApi.obtenerPedidoPorId(id);
    } catch (e) { console.error("pedidosService.obtenerPedidoPorId:", e); throw e; }
  },
  crearPedido: async ({ clienteId, items, observaciones }) => {
    try {
      if (!clienteId) throw new Error("Selecciona un cliente.");
      if (!items || items.length === 0) throw new Error("El pedido debe tener al menos un producto.");
      for (const item of items) {
        if (!item.productoId) throw new Error("Todos los ítems deben tener un producto seleccionado.");
        if (!item.cantidad || parseInt(item.cantidad) < 1) throw new Error("La cantidad de cada ítem debe ser mayor a 0.");
      }
      return await pedidosApi.crearPedido({
        clienteId: parseInt(clienteId),
        observaciones: observaciones?.trim() || undefined,
        items: items.map((item) => ({
          productoId: item.productoId,
          cantidad:   parseInt(item.cantidad),
          ...(item.precioUnitario !== "" && item.precioUnitario != null
            ? { precioUnitario: parseFloat(item.precioUnitario) } : {}),
        })),
      });
    } catch (e) { console.error("pedidosService.crearPedido:", e); throw e; }
  },
  asignarEntregador: async (pedidoId, entregadorId) => {
    try {
      if (!pedidoId)     throw new Error("Se requiere el ID del pedido.");
      if (!entregadorId) throw new Error("Selecciona un entregador.");
      return await pedidosApi.asignarEntregador(pedidoId, entregadorId);
    } catch (e) { console.error("pedidosService.asignarEntregador:", e); throw e; }
  },
  obtenerEntregadores: async () => {
    try { return await pedidosApi.obtenerEntregadores(); }
    catch (e) { console.error("pedidosService.obtenerEntregadores:", e); throw e; }
  },
  cancelarPedido: async (pedidoId) => {
    try {
      if (!pedidoId) throw new Error("Se requiere el ID del pedido.");
      return await pedidosApi.actualizarEstadoPedido(pedidoId, "Cancelado");
    } catch (e) { console.error("pedidosService.cancelarPedido:", e); throw e; }
  },
};
export default pedidosService;
