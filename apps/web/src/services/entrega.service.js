import entregasApi from "@/api/entregasApi";

const entregaService = {
  obtenerMisEntregas: async (filtros = {}) => {
    try {
      return await entregasApi.obtenerMisEntregas(filtros);
    } catch (e) {
      console.error("entregaService.obtenerMisEntregas:", e);
      throw e;
    }
  },
  marcarSalida: async (asignacionId) => {
    try {
      if (!asignacionId) throw new Error("Se requiere el ID de la asignación.");
      return await entregasApi.marcarSalida(asignacionId);
    } catch (e) {
      console.error("entregaService.marcarSalida:", e);
      throw e;
    }
  },
  confirmarEntrega: async (
    asignacionId,
    { montoCobrado, metodoPago, observaciones, fechaConfirmada },
  ) => {
    try {
      if (!asignacionId) throw new Error("Se requiere el ID de la asignación.");
      if (
        montoCobrado === "" ||
        montoCobrado === null ||
        montoCobrado === undefined
      )
        throw new Error("El monto cobrado es obligatorio.");
      if (parseFloat(montoCobrado) < 0)
        throw new Error("El monto cobrado no puede ser negativo.");
      if (!metodoPago) throw new Error("El método de pago es obligatorio.");

      // El input datetime-local entrega "YYYY-MM-DDTHH:mm" (sin segundos ni zona horaria),
      // pero el backend exige formato date-time completo (RFC3339). Lo convertimos acá.
      let fechaISO;
      if (fechaConfirmada) {
        const fechaParseada = new Date(fechaConfirmada);
        if (Number.isNaN(fechaParseada.getTime())) {
          throw new Error("La fecha confirmada no es válida.");
        }
        fechaISO = fechaParseada.toISOString();
      }

      return await entregasApi.confirmarEntrega(asignacionId, {
        montoCobrado,
        metodoPago,
        observacionesEntrega: observaciones?.trim() || undefined,
        fechaConfirmada: fechaISO,
      });
    } catch (e) {
      console.error("entregaService.confirmarEntrega:", e);
      throw e;
    }
  },
  registrarFallo: async (asignacionId, observaciones) => {
    try {
      if (!asignacionId) throw new Error("Se requiere el ID de la asignación.");
      if (!observaciones?.trim())
        throw new Error("Describe el motivo del fallo.");
      return await entregasApi.registrarFallo(
        asignacionId,
        observaciones.trim(),
      );
    } catch (e) {
      console.error("entregaService.registrarFallo:", e);
      throw e;
    }
  },
};
export default entregaService;
