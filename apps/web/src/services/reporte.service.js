import reportesApi from "@/api/reportesApi";
import pedidosApi from "@/api/pedidosApi";


const reporteService = {
  // ─── Panel general (KPIs del día/semana) ─────────────────────────────
  // Reemplaza: obtenerResumenGeneral, obtenerVentasPorPeriodo, obtenerResumenDia
  obtenerResumenGeneral: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerPanelGeneral(filtros);
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

  obtenerVentasPorPeriodo: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerPanelGeneral(filtros);
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

  // ─── Arqueo semanal ──────────────────────────────────────────────────
  // Reemplaza: obtenerCorteCaja
  obtenerCorteCaja: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerArqueo(filtros);
      return {
        resumen: datos?.resumen ?? datos,
        movimientos: Array.isArray(datos?.movimientos) ? datos.movimientos : [],
      };
    } catch (e) {
      console.error("reporteService.obtenerCorteCaja:", e);
      throw e;
    }
  },

  obtenerArqueo: async (filtros = {}) => {
    try {
      return await reportesApi.obtenerArqueo(filtros);
    } catch (e) {
      console.error("reporteService.obtenerArqueo:", e);
      throw e;
    }
  },

  // ─── Historial semanal ───────────────────────────────────────────────
  obtenerHistorialSemanal: async () => {
    try {
      const datos = await reportesApi.obtenerHistorialSemanal();
      return Array.isArray(datos) ? datos : [];
    } catch (e) {
      console.error("reporteService.obtenerHistorialSemanal:", e);
      throw e;
    }
  },

  // ─── Cobros por entregador → historial semanal (contiene entregas) ───
  obtenerCobrosEntregador: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerPanelGeneral(filtros);
      return {
        resumen: datos?.resumen ?? datos,
        detalle: Array.isArray(datos?.cobrosEntregador)
          ? datos.cobrosEntregador
          : [],
      };
    } catch (e) {
      console.error("reporteService.obtenerCobrosEntregador:", e);
      throw e;
    }
  },

  // ─── Stock bajo → panel-general incluye alertasInventario ────────────
  obtenerStockBajo: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerPanelGeneral(filtros);
      return Array.isArray(datos?.stockBajo) ? datos.stockBajo : [];
    } catch (e) {
      console.error("reporteService.obtenerStockBajo:", e);
      throw e;
    }
  },

  // ─── Deuda clientes → panel-general incluye cartera ──────────────────
  obtenerDeudaClientes: async (filtros = {}) => {
    try {
      const datos = await reportesApi.obtenerPanelGeneral(filtros);
      return {
        resumen: datos?.resumen ?? datos,
        detalle: Array.isArray(datos?.deudaClientes) ? datos.deudaClientes : [],
      };
    } catch (e) {
      console.error("reporteService.obtenerDeudaClientes:", e);
      throw e;
    }
  },

  // ─── KPIs del día (compatibilidad Dashboard) ──────────────────────────
  obtenerResumenDia: async (sedeId) => {
    try {
      const filtros = sedeId ? { sedeId } : {};
      return await reportesApi.obtenerPanelGeneral(filtros);
    } catch (e) {
      console.error("reporteService.obtenerResumenDia:", e);
      throw e;
    }
  },

  // ─── Últimos pedidos (compatibilidad Dashboard) ───────────────────────
  obtenerUltimosPedidos: async (sedeId, limite = 5) => {
    try {
      const filtros = sedeId ? { sedeId, limit: limite } : { limit: limite };
      const data = await pedidosApi.obtenerPedidos(filtros);
      const lista = Array.isArray(data) ? data : (data?.data ?? []);
      return lista.slice(0, limite);
    } catch (e) {
      console.error("reporteService.obtenerUltimosPedidos:", e);
      throw e;
    }
  },
};

export default reporteService;
