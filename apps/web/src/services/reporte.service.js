/**
 * reporte.service.js — Katepramax
 *
 * Capa de servicio para reportes.
 * Usa filtrarPorSede() para garantizar que Bodega/AdminBogota
 * NUNCA vea datos de otra sede — de forma centralizada.
 */

import reportesApi from "@/api/reportesApi";
import pedidosApi  from "@/api/pedidosApi";
import { filtrarPorSede } from "@/utils/permisos";

const reporteService = {
  /**
   * Panel general del día — KPIs + resumen por sede.
   * Bodega: ve solo su sede. Admin: puede filtrar por sedeId opcional.
   */
  obtenerResumenGeneral: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerPanelGeneral(filtrarPorSede(filtros));
      return {
        kpis:     datos?.kpis ?? datos ?? null,
        tendencia: Array.isArray(datos?.tendencia) ? datos.tendencia : [],
        porSede:   Array.isArray(datos?.porSede)   ? datos.porSede   : [],
      };
    } catch (e) {
      console.error("[reporteService] obtenerResumenGeneral:", e.message);
      throw e;
    }
  },

  obtenerVentasPorPeriodo: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerPanelGeneral(filtrarPorSede(filtros));
      return {
        resumen: datos?.resumen ?? datos,
        detalle: Array.isArray(datos?.detalle) ? datos.detalle : [],
        porSede: Array.isArray(datos?.porSede) ? datos.porSede : [],
      };
    } catch (e) {
      console.error("[reporteService] obtenerVentasPorPeriodo:", e.message);
      throw e;
    }
  },

  /**
   * Corte de caja / arqueo semanal.
   * Solo Admin puede ver todas las sedes.
   */
  obtenerCorteCaja: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerArqueo(filtrarPorSede(filtros));
      return {
        resumen:     datos?.resumen ?? datos,
        movimientos: Array.isArray(datos?.movimientos) ? datos.movimientos : [],
      };
    } catch (e) {
      console.error("[reporteService] obtenerCorteCaja:", e.message);
      throw e;
    }
  },

  obtenerArqueo: async (filtros = {}) => {
    try {
      return await reportesApi.obtenerArqueo(filtrarPorSede(filtros));
    } catch (e) {
      console.error("[reporteService] obtenerArqueo:", e.message);
      throw e;
    }
  },

  obtenerHistorialSemanal: async () => {
    try {
      const datos = await reportesApi.obtenerHistorialSemanal();
      return Array.isArray(datos?.data) ? datos.data : (Array.isArray(datos) ? datos : []);
    } catch (e) {
      console.error("[reporteService] obtenerHistorialSemanal:", e.message);
      throw e;
    }
  },

  obtenerCobrosEntregador: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerPanelGeneral(filtrarPorSede(filtros));
      return {
        resumen: datos?.resumen ?? datos,
        detalle: Array.isArray(datos?.cobrosEntregador) ? datos.cobrosEntregador : [],
      };
    } catch (e) {
      console.error("[reporteService] obtenerCobrosEntregador:", e.message);
      throw e;
    }
  },

  obtenerStockBajo: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerPanelGeneral(filtrarPorSede(filtros));
      return Array.isArray(datos?.stockBajo) ? datos.stockBajo : [];
    } catch (e) {
      console.error("[reporteService] obtenerStockBajo:", e.message);
      throw e;
    }
  },

  obtenerDeudaClientes: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerPanelGeneral(filtrarPorSede(filtros));
      return {
        resumen: datos?.resumen ?? datos,
        detalle: Array.isArray(datos?.deudaClientes) ? datos.deudaClientes : [],
      };
    } catch (e) {
      console.error("[reporteService] obtenerDeudaClientes:", e.message);
      throw e;
    }
  },

  obtenerResumenDia: async (filtros = {}) => {
    try {
      return await reportesApi.obtenerPanelGeneral(filtrarPorSede(filtros));
    } catch (e) {
      console.error("[reporteService] obtenerResumenDia:", e.message);
      throw e;
    }
  },

  obtenerUltimosPedidos: async (filtros = {}, limite = 5) => {
    try {
      const f    = filtrarPorSede({ ...filtros, take: limite });
      const data = await pedidosApi.obtenerPedidos(f);
      const lista = Array.isArray(data) ? data : (data?.data ?? []);
      return lista.slice(0, limite);
    } catch (e) {
      console.error("[reporteService] obtenerUltimosPedidos:", e.message);
      throw e;
    }
  },
};

export default reporteService;
