import inventarioApi from "@/api/inventarioApi";
import { obtenerSesion } from "@/utils/sessionHelper";

const inventarioService = {
  obtenerProductos: async () => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      
      // Intentar obtener datos de la API
      const productos = await inventarioApi.obtenerProductos();
      return productos;
    } catch (error) {
      console.error("Error en inventarioService.obtenerProductos:", error);
      throw error;
    }
  },
  
  obtenerMovimientos: async () => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      
      // Intentar obtener datos de la API
      const movimientos = await inventarioApi.obtenerMovimientos();
      return movimientos;
    } catch (error) {
      console.error("Error en inventarioService.obtenerMovimientos:", error);
      throw error;
    }
  },
  
  crearMovimiento: async (movimientoData) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      
      // Validar datos mínimos requeridos
      if (!movimientoData.productoId || !movimientoData.tipo || !movimientoData.cantidad) {
        throw new Error("Faltan datos requeridos para crear el movimiento");
      }
      
      // Intentar crear movimiento vía API
      const nuevoMovimiento = await inventarioApi.crearMovimiento(movimientoData);
      return nuevoMovimiento;
    } catch (error) {
      console.error("Error en inventarioService.crearMovimiento:", error);
      throw error;
    }
  }
};

export default inventarioService;