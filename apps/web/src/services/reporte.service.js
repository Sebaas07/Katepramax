/**
 * reporte.service.js — Katepramax
 *
 * Capa de servicio para reportes. Solo incluye funciones que tienen
 * un endpoint real detrás — nada de formas/kpis inventados.
 */

import reportesApi from "@/api/reportesApi";
import { filtrarPorSede } from "@/utils/permisos";

const reporteService = {
  /**
   * Panel general del día — usado en Contabilidad > Panel General.
   */
  obtenerPanelGeneral: async (fecha) => {
    try {
      return await reportesApi.obtenerPanelGeneral({ fecha });
    } catch (e) {
      console.error("[reporteService] obtenerPanelGeneral:", e.message);
      throw e;
    }
  },

  /**
   * Cobros por entregador en un rango de fechas.
   * Backend: GET /reportes/cobros-entregador?fechaInicio&fechaFin&sedeId
   */
  obtenerCobrosEntregador: async ({ fechaInicio, fechaFin, sedeId } = {}) => {
    try {
      if (!fechaInicio || !fechaFin) {
        throw new Error("Selecciona el rango de fechas.");
      }
      const filtros = filtrarPorSede({ fechaInicio, fechaFin, sedeId });
      const datos = await reportesApi.obtenerCobrosEntregador(filtros);
      return {
        detalle: Array.isArray(datos?.detalle) ? datos.detalle : [],
        total: Number(datos?.total ?? 0),
        totalDomicilios: Number(datos?.totalDomicilios ?? 0),
        pedidos: Number(datos?.pedidos ?? 0),
      };
    } catch (e) {
      console.error("[reporteService] obtenerCobrosEntregador:", e.message);
      throw e;
    }
  },
  /**
   * Corte de caja: ganancia (recaudo entregadores) vs. gasto (egresos)
   * en un rango de fechas. Sirve para el corte del día (desde == hasta),
   * quincena o mes — el rango lo arma quien llama a esta función.
   * Backend: GET /reportes/corte-caja?desde&hasta&sedeId
   */
  obtenerCorteCaja: async ({ desde, hasta, sedeId } = {}) => {
    try {
      if (!desde || !hasta) {
        throw new Error("Selecciona el rango de fechas.");
      }
      const filtros = filtrarPorSede({ desde, hasta, sedeId });
      const datos = await reportesApi.obtenerCorteCaja(filtros);
      return {
        desde: datos?.desde ?? desde,
        hasta: datos?.hasta ?? hasta,
        recaudo: {
          total: Number(datos?.recaudo?.total ?? 0),
          efectivo: Number(datos?.recaudo?.efectivo ?? 0),
          transferencia: Number(datos?.recaudo?.transferencia ?? 0),
          abonosDeuda: Number(datos?.recaudo?.abonosDeuda ?? 0),
          sinClasificar: Number(datos?.recaudo?.sinClasificar ?? 0),
          pedidosEntregados: Number(datos?.recaudo?.pedidosEntregados ?? 0),
        },
        egresos: {
          total: Number(datos?.egresos?.total ?? 0),
          porConcepto: Array.isArray(datos?.egresos?.porConcepto)
            ? datos.egresos.porConcepto
            : [],
        },
        ganancia: Number(datos?.ganancia ?? 0),
        porDia: Array.isArray(datos?.porDia) ? datos.porDia : [],
      };
    } catch (e) {
      console.error("[reporteService] obtenerCorteCaja:", e.message);
      throw e;
    }
  },
};

export default reporteService;
