import { proveedoresApi } from "@/api/proveedoresApi";
import { obtenerSesion } from "@/utils/sessionHelper";

const proveedoresService = {
  obtenerProveedores: async (filtros = {}) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      const proveedores = await proveedoresApi.obtenerProveedores(filtros);
      return proveedores;
    } catch (error) {
      console.error("Error en proveedoresService.obtenerProveedores:", error);
      throw error;
    }
  },

  obtenerProveedorPorId: async (id) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      const proveedor = await proveedoresApi.obtenerProveedorPorId(id);
      return proveedor;
    } catch (error) {
      console.error(
        "Error en proveedoresService.obtenerProveedorPorId:",
        error,
      );
      throw error;
    }
  },

  crearProveedor: async (proveedorData) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      if (!proveedorData.nombre || !proveedorData.identificacion) {
        throw new Error("Faltan datos requeridos para crear el proveedor");
      }
      const nuevoProveedor = await proveedoresApi.crearProveedor(proveedorData);
      return nuevoProveedor;
    } catch (error) {
      console.error("Error en proveedoresService.crearProveedor:", error);
      throw error;
    }
  },

  actualizarProveedor: async (id, proveedorData) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      const proveedorActualizado = await proveedoresApi.actualizarProveedor(
        id,
        proveedorData,
      );
      return proveedorActualizado;
    } catch (error) {
      console.error("Error en proveedoresService.actualizarProveedor:", error);
      throw error;
    }
  },

  eliminarProveedor: async (id) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }
      await proveedoresApi.eliminarProveedor(id);
      return true;
    } catch (error) {
      console.error("Error en proveedoresService.eliminarProveedor:", error);
      throw error;
    }
  },
};

export default proveedoresService;
