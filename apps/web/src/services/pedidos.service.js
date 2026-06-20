import pedidosApi from "@/api/pedidosApi";

/**
 * Mapa códigos reales de estado del API portable hacia etiquetas UI legibles.
 * Códigos posibles desde el backend:
 *   1  → Pendiente
 *   2  → Asignado
 *   3  → En ruta
 *   4  → Entregado
 *   5  → Fallido
 */
const MAPA_ESTADO = {
  1: "Pendiente",
  2: "Asignado",
  3: "En ruta",
  4: "Entregado",
  5: "Fallido",
};

const normalizarEstado = (raw) => {
  if (!raw && raw !== 0) return null;
  // Ya es string legible
  if (typeof raw === "string" && /^[A-Za-z]/.test(raw)) return raw;
  // Es código numérico
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return MAPA_ESTADO[n] ?? String(raw);
};

const pedidosService = {
  obtenerPedidos: async (filtros = {}) => {
    try {
      const f = { ...filtros };
      // Si el usuario envía estado en mayúscula, el backend portable acepta ambos formatos
      // No necesitamos transformar porque el backend portable mapea estados por insensibilidad
      return await pedidosApi.obtenerPedidos(f);
    } catch (e) { console.error("pedidosService.obtenerPedidos:", e); throw e; }
  },
  obtenerPedidoPorId: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del pedido.");
      const p = await pedidosApi.obtenerPedidoPorId(id);
      return {
        ...p,
        estado: normalizarEstado(p.estado),
      };
    } catch (e) { console.error("pedidosService.obtenerPedidoPorId:", e); throw e; }
  },
  crearPedido: async ({ clienteId, items, observaciones, sedeId }) => {
    try {
      if (!clienteId) throw new Error("Selecciona un cliente.");
      if (!items || items.length === 0) throw new Error("El pedido debe tener al menos un producto.");
      for (const item of items) {
        if (!item.productoId) throw new Error("Todos los ítems deben tener un producto seleccionado.");
        if (!item.cantidad || parseInt(item.cantidad) < 1) throw new Error("La cantidad de cada ítem debe ser mayor a 0.");
      }
      const payload = {
        clienteId: parseInt(clienteId),
        ...(sedeId !== undefined && sedeId !== null && sedeId !== "" ? { sedeId: parseInt(sedeId, 10) } : {}),
        observaciones: observaciones?.trim() || undefined,
        items: items.map((item) => ({
          productoId: item.productoId,
          cantidad:   parseInt(item.cantidad),
          ...(item.precioUnitario !== "" && item.precioUnitario != null
            ? { precioUnitario: parseFloat(item.precioUnitario) } : {}),
        })),
      };
      return await pedidosApi.crearPedido(payload);
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
  actualizarEstadoPedido: async (pedidoId, estado) => {
    try {
      if (!pedidoId) throw new Error("Se requiere el ID del pedido.");
      return await pedidosApi.actualizarEstadoPedido(pedidoId, estado);
    } catch (e) { console.error("pedidosService.actualizarEstadoPedido:", e); throw e; }
  },

  obtenerHistorial: async (pedidoId) => {
    if (!pedidoId) throw new Error("Se requiere el ID del pedido.");
    return await pedidosApi.obtenerHistorial(pedidoId);
  },
};

export default pedidosService;
