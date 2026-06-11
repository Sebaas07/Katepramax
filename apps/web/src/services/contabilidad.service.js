import contabilidadApi from "@/api/contabilidadApi";
import { getSemanaISO } from "@/utils/formatters";

/**
 * contabilidad.service.js — Katepramax
 *
 * Reglas del negocio (extraídas del Excel real de Katepramax):
 * - Total ingresos = efectivo + cuentas — calculado aquí, no ingresado manualmente
 * - Cartera: usuario solo ingresa saldoDia, el backend calcula la variación
 * - Semana calculada automáticamente desde la fecha con getSemanaISO
 * - Egresos tienen observaciones largas (ej: "SUELDO POLLO Y PAGO NUÑEZ")
 *
 * Fallback silencioso: mientras el backend no tenga /contabilidad/*,
 * todos los GET retornan [] sin mostrar errores al usuario.
 */
const contabilidadService = {
  // ── INGRESOS ──────────────────────────────────────────────
  obtenerIngresos: async (filtros = {}) => {
    try {
      return await contabilidadApi.obtenerIngresos(filtros);
    } catch {
      return []; // Backend pendiente — fallback silencioso
    }
  },

  registrarIngreso: async ({ fecha, sedeId, efectivo, cuentas, observacion }) => {
    try {
      if (!fecha)  throw new Error("La fecha es obligatoria.");
      if (!sedeId) throw new Error("Selecciona la sede.");

      const ef  = parseFloat(efectivo) || 0;
      const cu  = parseFloat(cuentas)  || 0;
      if (ef === 0 && cu === 0)
        throw new Error("Ingresa al menos un valor en Efectivo o Cuentas.");

      const semana = getSemanaISO(new Date(fecha));

      return await contabilidadApi.registrarIngreso({
        fecha,
        semana,
        sedeId:     parseInt(sedeId),
        efectivo:   ef,
        cuentas:    cu,
        total:      ef + cu,
        observacion: observacion?.trim() || undefined,
      });
    } catch (error) {
      console.error("contabilidadService.registrarIngreso:", error);
      throw error;
    }
  },

  editarIngreso: async (id, datos) => {
    try {
      if (!id) throw new Error("Se requiere el ID del ingreso.");
      const payload = { ...datos };
      if (payload.efectivo !== undefined || payload.cuentas !== undefined) {
        payload.total = (parseFloat(payload.efectivo) || 0) +
                        (parseFloat(payload.cuentas)  || 0);
      }
      return await contabilidadApi.editarIngreso(id, payload);
    } catch (error) {
      console.error("contabilidadService.editarIngreso:", error);
      throw error;
    }
  },

  eliminarIngreso: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del ingreso.");
      return await contabilidadApi.eliminarIngreso(id);
    } catch (error) {
      console.error("contabilidadService.eliminarIngreso:", error);
      throw error;
    }
  },

  // ── EGRESOS ───────────────────────────────────────────────
  obtenerEgresos: async (filtros = {}) => {
    try {
      return await contabilidadApi.obtenerEgresos(filtros);
    } catch {
      return []; // Backend pendiente — fallback silencioso
    }
  },

  registrarEgreso: async ({ fecha, sedeId, concepto, total, observaciones }) => {
    try {
      if (!fecha)          throw new Error("La fecha es obligatoria.");
      if (!sedeId)         throw new Error("Selecciona la sede.");
      if (!concepto?.trim()) throw new Error("El concepto es obligatorio.");

      const totalNum = parseFloat(total);
      if (isNaN(totalNum) || totalNum < 0)
        throw new Error("Ingresa un total válido.");

      const semana = getSemanaISO(new Date(fecha));
      const dia    = new Date(fecha)
        .toLocaleDateString("es-CO", { weekday: "long" })
        .toUpperCase();

      return await contabilidadApi.registrarEgreso({
        fecha,
        semana,
        sedeId:       parseInt(sedeId),
        concepto:     concepto.trim(),
        total:        totalNum,
        observaciones: observaciones?.trim() || undefined,
        dia,
      });
    } catch (error) {
      console.error("contabilidadService.registrarEgreso:", error);
      throw error;
    }
  },

  editarEgreso: async (id, datos) => {
    try {
      if (!id) throw new Error("Se requiere el ID del egreso.");
      return await contabilidadApi.editarEgreso(id, datos);
    } catch (error) {
      console.error("contabilidadService.editarEgreso:", error);
      throw error;
    }
  },

  eliminarEgreso: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del egreso.");
      return await contabilidadApi.eliminarEgreso(id);
    } catch (error) {
      console.error("contabilidadService.eliminarEgreso:", error);
      throw error;
    }
  },

  // ── CARTERA ───────────────────────────────────────────────
  obtenerCartera: async (filtros = {}) => {
    try {
      return await contabilidadApi.obtenerCartera(filtros);
    } catch {
      return []; // Backend pendiente — fallback silencioso
    }
  },

  registrarCartera: async ({ fecha, sedeId, saldoDia }) => {
    try {
      if (!fecha)  throw new Error("La fecha es obligatoria.");
      if (!sedeId) throw new Error("Selecciona la sede.");

      const saldo = parseFloat(saldoDia);
      if (isNaN(saldo) || saldo < 0)
        throw new Error("Ingresa un saldo válido.");

      const semana = getSemanaISO(new Date(fecha));

      return await contabilidadApi.registrarCartera({
        fecha,
        semana,
        sedeId:   parseInt(sedeId),
        saldoDia: saldo,
      });
    } catch (error) {
      console.error("contabilidadService.registrarCartera:", error);
      throw error;
    }
  },

  // ── PROVEEDORES ────────────────────────────────────────────
  obtenerProveedores: async (filtros = {}) => {
    try {
      return await contabilidadApi.obtenerProveedores(filtros);
    } catch {
      return [];
    }
  },

  registrarPagoProveedor: async (data) => {
    try {
      return await contabilidadApi.registrarPagoProveedor(data);
    } catch (error) {
      console.error("contabilidadService.registrarPagoProveedor:", error);
      throw error;
    }
  },

  obtenerResumenProveedores: async (semana) => {
    try {
      return await contabilidadApi.obtenerResumenProveedores(semana);
    } catch {
      return [];
    }
  },

  // ── ARQUEO ────────────────────────────────────────────────
  obtenerArqueo: async (semana) => {
    try {
      const sem = semana ?? getSemanaISO(new Date());
      return await contabilidadApi.obtenerArqueo(sem);
    } catch {
      return null;
    }
  },

  obtenerPanelGeneral: async (fecha) => {
    try {
      return await contabilidadApi.obtenerPanelGeneral(fecha);
    } catch {
      return null;
    }
  },

  obtenerInventarioSemanal: async (semana) => {
    try {
      return await contabilidadApi.obtenerInventarioSemanal(semana);
    } catch {
      return [];
    }
  },
};

export default contabilidadService;
