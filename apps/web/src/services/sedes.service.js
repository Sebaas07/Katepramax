import sedesApi from "@/api/sedesApi";
import { getApiErrorMessage, normalizeArrayResponse } from "@/utils/apiHelpers";

const limpiarTexto = (valor) => String(valor ?? "").trim();

const sedesService = {
  obtenerSedes: async () => {
    try {
      const data = await sedesApi.obtenerSedes();
      return normalizeArrayResponse(data);
    } catch (error) {
      console.error("sedesService.obtenerSedes:", error);
      throw new Error(getApiErrorMessage(error), { cause: error });
    }
  },

  crearSede: async (datos) => {
    try {
      const nombre = limpiarTexto(datos.nombre);
      if (!nombre) throw new Error("El nombre de la sede es obligatorio.");
      return await sedesApi.crearSede({ nombre });
    } catch (error) {
      console.error("sedesService.crearSede:", error);
      throw error;
    }
  },

  actualizarSede: async (id, datos) => {
    try {
      if (!id) throw new Error("Se requiere el ID de la sede.");

      const payload = {};
      if (datos.nombre !== undefined) {
        const nombre = limpiarTexto(datos.nombre);
        if (!nombre) throw new Error("El nombre de la sede no puede estar vacío.");
        payload.nombre = nombre;
      }
      if (datos.activo !== undefined) payload.activo = Boolean(datos.activo);

      return await sedesApi.actualizarSede(id, payload);
    } catch (error) {
      console.error("sedesService.actualizarSede:", error);
      throw error;
    }
  },
};

export default sedesService;