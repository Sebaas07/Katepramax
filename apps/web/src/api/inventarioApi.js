import { obtenerSesion } from "@/utils/sessionHelper";

// Mock data - esto será reemplazado por llamadas reales al backend
import { 
  PRODUCTOS_MOCK, 
  MOVIMIENTOS_INVENTARIO_MOCK 
} from "@/mocks/datosInventario.mock";

const API_BASE_URL = import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

const inventarioApi = {
  obtenerProductos: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/productos`, {
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
      console.warn("API falló, usando mock data para productos:", error);
      return PRODUCTOS_MOCK;
    }
  },
  
  obtenerMovimientos: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventario/movimientos`, {
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
      console.warn("API falló, usando mock data para movimientos:", error);
      return MOVIMIENTOS_INVENTARIO_MOCK;
    }
  },
  
  crearMovimiento: async (movimientoData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/inventario/movimientos`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${obtenerSesion()?.token || ""}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(movimientoData)
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.warn("API falló, simulando creación de movimiento:", error);
      // En un entorno real, aquí se haría algo diferente
      return { 
        id: Date.now(), 
        ...movimientoData, 
        creadoEn: new Date().toISOString() 
      };
    }
  }
};

export default inventarioApi;