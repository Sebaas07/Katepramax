import { obtenerSesion } from "@/utils/sessionHelper";

// Mock data - esto será reemplazado por llamadas reales al backend
import { 
  PEDIDOS_MOCK, 
  ENTREGADORES_MOCK 
} from "@/mocks/datosPedidos.mock";

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api/v1";

const pedidosApi = {
  obtenerPedidos: async (filtros = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}/pedidos`, {
        method: "POST", // Using POST to send filters in body
        headers: {
          "Authorization": `Bearer ${obtenerSesion()?.token || ""}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(filtros)
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn("API falló, usando mock data para pedidos:", error);
      return PEDIDOS_MOCK;
    }
  },
  
  crearPedido: async (pedidoData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/pedidos`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${obtenerSesion()?.token || ""}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(pedidoData)
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn("API falló, simulando creación de pedido:", error);
      // Generar ID temporal
      const idTemp = Date.now();
      
      return {
        id: idTemp,
        codigo: `KP-${idTemp}`,
        ...pedidoData,
        estado: "pendiente",
        creadoEn: new Date().toISOString(),
        total: pedidoData.items.reduce((sum, item) => 
          sum + (item.precio || 0) * item.cantidad, 0)
      };
    }
  },
  
  asignarEntregador: async (pedidoId, entregadorId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/asignar`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${obtenerSesion()?.token || ""}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ entregadorId })
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn("API falló, simulando asignación de entregador:", error);
      // Encontrar el pedido en mocks y actualizarlo
      const pedidoIndex = PEDIDOS_MOCK.findIndex(p => p.id == pedidoId);
      if (pedidoIndex !== -1) {
        // Find the entregador
        const entregador = ENTREGADORES_MOCK.find(e => e.id == entregadorId);
        return {
          ...PEDIDOS_MOCK[pedidoIndex],
          entregadorId: entregadorId,
          entregador: entregador ? entregador.nombreCompleto : null
        };
      }
      throw new Error("Pedido no encontrado");
    }
  },
  
  obtenerEntregadoresDisponibles: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/entregadores/disponibles`, {
        headers: {
          "Authorization": `Bearer ${obtenerSesion()?.token || ""}`,
          "Content-Type": "application/json"
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn("API falló, usando mock data para entregadores:", error);
      return ENTREGADORES_MOCK;
    }
  }
};

export default pedidosApi;