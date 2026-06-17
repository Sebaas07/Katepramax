import reportesApi from "@/api/reportesApi";

/**
 * reporte.service.js — Katepramax
 * Capa de servicio para el módulo de reportes.
 * Normaliza parámetros, transforma respuestas y maneja errores.
 */

const reporteService = {
  // ─── Resumen general ─────────────────────────────────────────────────
  obtenerResumenGeneral: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerResumenGeneral(filtros);
      return {
        kpis: datos?.kpis ?? datos ?? null,
        tendencia: Array.isArray(datos?.tendencia) ? datos.tendencia : [],
        porSede: Array.isArray(datos?.porSede) ? datos.porSede : [],
      };
    } catch (e) {
      console.error("reporteService.obtenerResumenGeneral:", e);
      throw e;
    }
  },

  // ─── Ventas por período ───────────────────────────────────────────────
  obtenerVentasPorPeriodo: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerVentasPorPeriodo(filtros);
      return {
        resumen: datos?.resumen ?? datos,
        detalle: Array.isArray(datos?.detalle) ? datos.detalle : [],
        porSede: Array.isArray(datos?.porSede) ? datos.porSede : [],
      };
    } catch (e) {
      console.error("reporteService.obtenerVentasPorPeriodo:", e);
      throw e;
    }
  },

  // ─── Corte de caja ────────────────────────────────────────────────────
  obtenerCorteCaja: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerCorteCaja(filtros);
      return {
        resumen: datos?.resumen ?? datos,
        movimientos: Array.isArray(datos?.movimientos) ? datos.movimientos : [],
      };
    } catch (e) {
      console.error("reporteService.obtenerCorteCaja:", e);
      throw e;
    }
  },

  // ─── Cobros por entregador ────────────────────────────────────────────
  obtenerCobrosEntregador: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerCobrosEntregador(filtros);
      return {
        resumen: datos?.resumen ?? datos,
        detalle: Array.isArray(datos?.detalle) ? datos.detalle : [],
      };
    } catch (e) {
      console.error("reporteService.obtenerCobrosEntregador:", e);
      throw e;
    }
  },

  // ─── Stock bajo ───────────────────────────────────────────────────────
  obtenerStockBajo: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerStockBajo(filtros);
      return Array.isArray(datos) ? datos : [];
    } catch (e) {
      console.error("reporteService.obtenerStockBajo:", e);
      throw e;
    }
  },

  // ─── Deuda clientes ───────────────────────────────────────────────────
  obtenerDeudaClientes: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerDeudaClientes(filtros);
      return {
        resumen: datos?.resumen ?? datos,
        detalle: Array.isArray(datos?.detalle) ? datos.detalle : [],
      };
    } catch (e) {
      console.error("reporteService.obtenerDeudaClientes:", e);
      throw e;
    }
  },

  // ─── KPIs del día (compatibilidad Dashboard) ──────────────────────────
  obtenerResumenDia: async (sedeId) => {
    try {
      return await reportesApi.obtenerResumenDia(sedeId);
    } catch (e) {
      console.error("reporteService.obtenerResumenDia:", e);
      throw e;
    }
  },

  obtenerUltimosPedidos: async (sedeId, limite = 5) => {
    try {
      return await reportesApi.obtenerUltimosPedidos(sedeId, limite);
    } catch (e) {
      console.error("reporteService.obtenerUltimosPedidos:", e);
      throw e;
    }
  },
};

export default reporteService;
