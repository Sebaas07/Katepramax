import pedidosApi from "@/api/pedidosApi";
import { obtenerSesion } from "@/utils/sessionHelper";

const pedidosService = {
  obtenerPedidos: async (filtros = {}) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      
      // Intentar obtener datos de la API
      const pedidos = await pedidosApi.obtenerPedidos(filtros);
      return pedidos;
    } catch (error) {
      console.error("Error en pedidosService.obtenerPedidos:", error);
      throw error;
    }
  },
   
  crearPedido: async (pedidoData) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      
      // Validar datos mínimos requeridos
      if (!pedidoData.cliente || !pedidoData.direccion || !pedidoData.sedeId) {
        throw new Error("Faltan datos requeridos para crear el pedido");
      }
      
      if (!pedidoData.items || pedidoData.items.length === 0) {
        throw new Error("El pedido debe tener al menos un ítem");
      }
      
      // Validar cada ítem
      for (const item of pedidoData.items) {
        if (!item.productoId || !item.cantidad || item.cantidad <= 0) {
          throw new Error("Cada ítem debe tener un productoId válido y cantidad mayor a 0");
        }
      }
      
      // Intentar crear pedido vía API
      const nuevoPedido = await pedidosApi.crearPedido(pedidoData);
      return nuevoPedido;
    } catch (error) {
      console.error("Error en pedidosService.crearPedido:", error);
      throw error;
    }
  },
   
  asignarEntregador: async (pedidoId, entregadorId) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      
      // Validar IDs
      if (!pedidoId || !entregadorId) {
        throw new Error("Se requieren ambos IDs: pedido y entregador");
      }
      
      // Intentar asignar entregador vía API
      const pedidoActualizado = await pedidosApi.asignarEntregador(pedidoId, entregadorId);
      return pedidoActualizado;
    } catch (error) {
      console.error("Error en pedidosService.asignarEntregador:", error);
      throw error;
    }
  },
  
  obtenerEntregadoresDisponibles: async () => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      
      // Intentar obtener datos de la API
      const entregadores = await pedidosApi.obtenerEntregadoresDisponibles();
      return entregadores;
    } catch (error) {
      console.error("Error en pedidosService.obtenerEntregadoresDisponibles:", error);
      throw error;
    }
  }
};

export default pedidosService;