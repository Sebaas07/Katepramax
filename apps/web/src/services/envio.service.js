import envioApi from "@/api/envioApi";

/**
 * envio.service.js
 * Guías de envío de mercancía entre sedes: crear, listar, confirmar recepción.
 */
const envioService = {
  /**
   * Crea un envío hacia una o varias sedes destino. El mismo listado de
   * productos/cantidades se manda completo a cada sede seleccionada.
   */
  crearEnvio: async ({ sedeOrigenId, sedesDestinoIds, detalles, observaciones }) => {
    try {
      if (!Array.isArray(sedesDestinoIds) || sedesDestinoIds.length === 0) {
        throw new Error("Selecciona al menos una sede destino.");
      }
      if (!Array.isArray(detalles) || detalles.length === 0) {
        throw new Error("Agrega al menos un producto al envío.");
      }
      for (const d of detalles) {
        if (!d.productoId) throw new Error("Falta seleccionar un producto en una de las líneas.");
        if (!d.cantidad || Number(d.cantidad) <= 0) {
          throw new Error("La cantidad de cada producto debe ser mayor a 0.");
        }
      }

      return await envioApi.crearEnvio({
        ...(sedeOrigenId ? { sedeOrigenId: Number(sedeOrigenId) } : {}),
        sedesDestinoIds: sedesDestinoIds.map(Number),
        detalles: detalles.map((d) => ({
          productoId: Number(d.productoId),
          cantidad: Number(d.cantidad),
        })),
        ...(observaciones?.trim() ? { observaciones: observaciones.trim() } : {}),
      });
    } catch (e) {
      console.error("[envioService] crearEnvio:", e.message);
      throw e;
    }
  },

  /**
   * direccion: "enviados" | "recibidos" | undefined (ambos)
   */
  obtenerEnvios: async (filtros = {}) => {
    try {
      return await envioApi.obtenerEnvios(filtros);
    } catch (e) {
      console.error("[envioService] obtenerEnvios:", e.message);
      throw e;
    }
  },

  obtenerPendientesCount: async () => {
    try {
      const data = await envioApi.obtenerPendientesCount();
      return Number(data?.pendientes ?? 0);
    } catch (e) {
      console.error("[envioService] obtenerPendientesCount:", e.message);
      return 0; // el badge de notificación no debe romper el sidebar si falla
    }
  },

  obtenerEnvioPorId: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del envío.");
      return await envioApi.obtenerEnvioPorId(id);
    } catch (e) {
      console.error("[envioService] obtenerEnvioPorId:", e.message);
      throw e;
    }
  },

  /**
   * Confirma la recepción de un envío.
   * detalles: [{ envioDetalleId, cantidadRecibida, observacion? }]
   * Si alguna cantidadRecibida es menor a la enviada, esa línea DEBE traer
   * observacion (cuánto faltó o si llegó algo dañado).
   */
  confirmarEnvio: async (id, { detalles, observacionRecepcion }) => {
    try {
      if (!id) throw new Error("Se requiere el ID del envío.");
      if (!Array.isArray(detalles) || detalles.length === 0) {
        throw new Error("Debes confirmar la cantidad recibida de cada producto.");
      }
      for (const d of detalles) {
        if (d.cantidadRecibida === "" || d.cantidadRecibida === null || d.cantidadRecibida === undefined) {
          throw new Error("Falta indicar la cantidad recibida de algún producto.");
        }
        if (Number(d.cantidadRecibida) < 0) {
          throw new Error("La cantidad recibida no puede ser negativa.");
        }
      }

      return await envioApi.confirmarEnvio(id, {
        detalles: detalles.map((d) => ({
          envioDetalleId: Number(d.envioDetalleId),
          cantidadRecibida: Number(d.cantidadRecibida),
          ...(d.observacion?.trim() ? { observacion: d.observacion.trim() } : {}),
        })),
        ...(observacionRecepcion?.trim() ? { observacionRecepcion: observacionRecepcion.trim() } : {}),
      });
    } catch (e) {
      console.error("[envioService] confirmarEnvio:", e.message);
      throw e;
    }
  },
};

export default envioService;
