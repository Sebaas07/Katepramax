import proveedoresApi from "@/api/proveedoresApi";

/**
 * proveedores.service.js — Katepramax
 * Lógica de negocio del lado cliente para el módulo de proveedores.
 * Schema real: { id, nombre, activo, creadoEn }
 */
const proveedoresService = {
  obtenerProveedores: async (filtros = {}) => {
    try {
      return await proveedoresApi.obtenerProveedores(filtros);
    } catch (error) {
      console.error("Error en proveedoresService.obtenerProveedores:", error);
      throw error;
    }
  },

  crearProveedor: async (data) => {
    try {
      if (!data.nombre?.trim()) throw new Error("El nombre del proveedor es obligatorio.");
      return await proveedoresApi.crearProveedor({ nombre: data.nombre.trim() });
    } catch (error) {
      console.error("Error en proveedoresService.crearProveedor:", error);
      throw error;
    }
  },

  actualizarProveedor: async (id, data) => {
    try {
      if (!id) throw new Error("Se requiere el ID del proveedor.");
      return await proveedoresApi.actualizarProveedor(id, data);
    } catch (error) {
      console.error("Error en proveedoresService.actualizarProveedor:", error);
      throw error;
    }
  },

  desactivarProveedor: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del proveedor.");
      return await proveedoresApi.desactivarProveedor(id);
    } catch (error) {
      console.error("Error en proveedoresService.desactivarProveedor:", error);
      throw error;
    }
  },
};

export default proveedoresService;
