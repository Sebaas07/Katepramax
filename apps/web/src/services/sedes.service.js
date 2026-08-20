import sedesApi from "@/api/sedesApi";
import { getApiErrorMessage, normalizeArrayResponse } from "@/utils/apiHelpers";

const limpiarTexto = (valor) => String(valor ?? "").trim();

const sedesService = {
  // Por defecto el backend solo devuelve sedes ACTIVAS. Pasar
  // { activo: "todas" } (módulo de administración) para ver también inactivas.
  obtenerSedes: async ({ activo } = {}) => {
    try {
      const params = {};
      if (activo !== undefined && activo !== null && activo !== "") {
        params.activo = activo;
      }
      const data = await sedesApi.obtenerSedes(params);
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

      const payload = { nombre, tipo: datos.tipo === "Oficina" ? "Oficina" : "Bodega" };
      if (datos.bodegaId != null && datos.bodegaId !== "") {
        payload.bodegaId = Number(datos.bodegaId);
      }
      return await sedesApi.crearSede(payload);
    } catch (error) {
      console.error("sedesService.crearSede:", error);
      throw new Error(getApiErrorMessage(error), { cause: error });
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
      if (datos.tipo !== undefined) {
        payload.tipo = datos.tipo === "Oficina" ? "Oficina" : "Bodega";
      }
      if (datos.bodegaId !== undefined) {
        payload.bodegaId = datos.bodegaId === null || datos.bodegaId === ""
          ? null
          : Number(datos.bodegaId);
      }

      return await sedesApi.actualizarSede(id, payload);
    } catch (error) {
      console.error("sedesService.actualizarSede:", error);
      throw new Error(getApiErrorMessage(error), { cause: error });
    }
  },
};

export default sedesService;