import pedidosApi from "@/api/pedidosApi";
import { obtenerSedeUsuario, tieneAccesoTotal } from "@/utils/permisos";

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
      // Si no es Admin, enviar sedeId automáticamente
      if (!tieneAccesoTotal()) {
        const sedeIdUsuario = obtenerSedeUsuario();
        if (sedeIdUsuario) {
          f.sedeId = sedeIdUsuario;
        }
      }
      // Si el usuario envía estado en mayúscula, el backend portable acepta ambos formatos
      return await pedidosApi.obtenerPedidos(f);
    } catch (e) {
      console.error("pedidosService.obtenerPedidos:", e);
      throw e;
    }
  },
  obtenerPedidoPorId: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del pedido.");
      const p = await pedidosApi.obtenerPedidoPorId(id);
      return {
        ...p,
        estado: normalizarEstado(p.estado),
      };
    } catch (e) {
      console.error("pedidosService.obtenerPedidoPorId:", e);
      throw e;
    }
  },
  crearPedido: async ({
    clienteId,
    items,
    direccion,
    observaciones,
    valorDomicilio,
    sedeId,
  }) => {
    try {
      if (!clienteId) throw new Error("Selecciona un cliente.");
      if (!items || items.length === 0)
        throw new Error("El pedido debe tener al menos un producto.");
      for (const item of items) {
        if (!item.productoId)
          throw new Error(
            "Todos los ítems deben tener un producto seleccionado.",
          );
        if (!item.cantidad || parseInt(item.cantidad) < 1)
          throw new Error("La cantidad de cada ítem debe ser mayor a 0.");
      }

      // Si no es Admin, usar sede del usuario
      const sedeFinal =
        sedeId ?? (!tieneAccesoTotal() ? obtenerSedeUsuario() : undefined);

      const payload = {
        clienteId: parseInt(clienteId),
        ...(sedeFinal ? { sedeId: parseInt(sedeFinal, 10) } : {}),
        direccion: direccion?.trim() || undefined,
        observaciones: observaciones?.trim() || undefined,
        ...(valorDomicilio != null && !Number.isNaN(Number(valorDomicilio))
          ? { valorDomicilio: Number(valorDomicilio) }
          : {}),
        items: items.map((item) => ({
          productoId: item.productoId,
          cantidad: parseInt(item.cantidad),
          ...(item.precioUnitario !== "" && item.precioUnitario != null
            ? { precioUnitario: parseFloat(item.precioUnitario) }
            : {}),
        })),
      };
      return await pedidosApi.crearPedido(payload);
    } catch (e) {
      console.error("pedidosService.crearPedido:", e);
      throw e;
    }
  },
  asignarEntregador: async (pedidoId, entregadorId) => {
    try {
      if (!pedidoId) throw new Error("Se requiere el ID del pedido.");
      if (!entregadorId) throw new Error("Selecciona un entregador.");
      return await pedidosApi.asignarEntregador(pedidoId, entregadorId);
    } catch (e) {
      console.error("pedidosService.asignarEntregador:", e);
      throw e;
    }
  },
  obtenerEntregadores: async () => {
    try {
      return await pedidosApi.obtenerEntregadores();
    } catch (e) {
      console.error("pedidosService.obtenerEntregadores:", e);
      throw e;
    }
  },
  cancelarPedido: async (pedidoId) => {
    try {
      if (!pedidoId) throw new Error("Se requiere el ID del pedido.");
      return await pedidosApi.actualizarEstadoPedido(pedidoId, "Cancelado");
    } catch (e) {
      console.error("pedidosService.cancelarPedido:", e);
      throw e;
    }
  },
  actualizarEstadoPedido: async (pedidoId, estado) => {
    try {
      if (!pedidoId) throw new Error("Se requiere el ID del pedido.");
      return await pedidosApi.actualizarEstadoPedido(pedidoId, estado);
    } catch (e) {
      console.error("pedidosService.actualizarEstadoPedido:", e);
      throw e;
    }
  },

  obtenerHistorial: async (pedidoId) => {
    if (!pedidoId) throw new Error("Se requiere el ID del pedido.");
    return await pedidosApi.obtenerHistorial(pedidoId);
  },

  /**
   * Datos de la factura de un pedido (ticket imprimible con QR).
   * Endpoint público: funciona incluso sin sesión iniciada.
   */
  obtenerFactura: async (pedidoId) => {
    if (!pedidoId) throw new Error("Se requiere el ID del pedido.");
    return await pedidosApi.obtenerFactura(pedidoId);
  },

  /**
   * Cantidad de pedidos pendientes por asignar (notificación de la Bodega
   * cuando una oficina crea un pedido).
   */
  obtenerPendientesCount: async () => {
    try {
      const data = await pedidosApi.obtenerPendientesCount();
      return Number(data?.pendientes ?? 0);
    } catch (e) {
      console.error("[pedidosService] obtenerPendientesCount:", e.message);
      return 0;
    }
  },
};

export default pedidosService;
