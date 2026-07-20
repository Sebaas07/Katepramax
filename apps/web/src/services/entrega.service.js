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
    {
      montoCobrado,
      metodoPago,
      montoEfectivo,
      montoTransferencia,
      abonoDeuda,
      observaciones,
      fechaConfirmada,
    },
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

      if (metodoPago === "Mixto") {
        if (
          montoEfectivo === "" || montoEfectivo === null || montoEfectivo === undefined ||
          montoTransferencia === "" || montoTransferencia === null || montoTransferencia === undefined
        ) {
          throw new Error("Para pago Mixto ingresa el monto en efectivo y en transferencia.");
        }
        const suma = parseFloat(montoEfectivo) + parseFloat(montoTransferencia);
        if (Math.abs(suma - parseFloat(montoCobrado)) > 0.01) {
          throw new Error(
            "La suma de efectivo + transferencia debe ser igual al monto cobrado.",
          );
        }
      }

      if (metodoPago === "Credito" && parseFloat(montoCobrado) !== 0) {
        throw new Error("Con pago a Crédito, el monto cobrado debe ser 0.");
      }

      if (abonoDeuda !== "" && abonoDeuda !== null && abonoDeuda !== undefined) {
        if (parseFloat(abonoDeuda) < 0) {
          throw new Error("El abono a la deuda no puede ser negativo.");
        }
      }

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
        montoEfectivo: metodoPago === "Mixto" ? montoEfectivo : undefined,
        montoTransferencia: metodoPago === "Mixto" ? montoTransferencia : undefined,
        abonoDeuda: abonoDeuda || undefined,
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
