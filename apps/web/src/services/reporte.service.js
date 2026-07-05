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
   * Historial semanal acumulado — usado en Contabilidad > Historial Semanal.
   */
  obtenerHistorialSemanal: async () => {
    try {
      const datos = await reportesApi.obtenerHistorialSemanal();
      return Array.isArray(datos?.data) ? datos.data : [];
    } catch (e) {
      console.error("[reporteService] obtenerHistorialSemanal:", e.message);
      return [];
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
        pedidos: Number(datos?.pedidos ?? 0),
      };
    } catch (e) {
      console.error("[reporteService] obtenerCobrosEntregador:", e.message);
      throw e;
    }
  },
};

export default reporteService;
