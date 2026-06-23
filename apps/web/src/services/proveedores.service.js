import proveedoresApi from "@/api/proveedoresApi";

const proveedoresService = {
  obtenerProveedores: async (filtros = {}) => {
    try {
      const f = { ...filtros };
      return await proveedoresApi.obtenerProveedores(f);
    } catch (error) {
      console.error("Error en proveedoresService.obtenerProveedores:", error);
      throw error;
    }
  },

  obtenerProveedorPorId: async (id) => {
    try {
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
      if (!proveedorData.nombre) {
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
      await proveedoresApi.eliminarProveedor(id);
      return true;
    } catch (error) {
      console.error("Error en proveedoresService.eliminarProveedor:", error);
      throw error;
    }
  },
};

export default proveedoresService;