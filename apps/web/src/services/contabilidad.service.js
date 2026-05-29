import contabilidadApi from "@/api/contabilidadApi";
import { getSemanaISO } from "@/utils/formatters";

/**
 * contabilidad.service.js — Katepramax
 * Lógica de negocio del lado cliente para el módulo de contabilidad.
 *
 * Reglas del negocio (extraídas del Excel real):
 * - Total de ingresos = efectivo + cuentas (calculado aquí, no ingresado)
 * - Cartera: el usuario solo ingresa el saldo del día — la variación la calcula el backend
 * - Semana se calcula automáticamente desde la fecha si no se pasa
 * - Egresos tienen observaciones largas (salarios, arriendos, etc.)
 * - Concepto de egreso por defecto es "Gastos" pero editable
 */
const contabilidadService = {

  // ── INGRESOS ──────────────────────────────────────────────
  obtenerIngresos: async (filtros = {}) => {
    try {
      return await contabilidadApi.obtenerIngresos(filtros);
    } catch {
      return []; // Backend aún no tiene este endpoint — retornar vacío
    }
  },

  registrarIngreso: async ({ fecha, sedeId, efectivo, cuentas, observacion }) => {
    try {
      if (!fecha)   throw new Error("La fecha es obligatoria.");
      if (!sedeId)  throw new Error("Selecciona la sede.");

      const efectivoNum = parseFloat(efectivo) || 0;
      const cuentasNum  = parseFloat(cuentas)  || 0;

      if (efectivoNum === 0 && cuentasNum === 0)
        throw new Error("Ingresa al menos un valor en Efectivo o Cuentas.");

      const semana = getSemanaISO(new Date(fecha));
      const total  = efectivoNum + cuentasNum;

      return await contabilidadApi.registrarIngreso({
        fecha,
        semana,
        sedeId:    parseInt(sedeId),
        efectivo:  efectivoNum,
        cuentas:   cuentasNum,
        total,
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

  // ── EGRESOS ──────────────────────────────────────────────
  obtenerEgresos: async (filtros = {}) => {
    try {
      return await contabilidadApi.obtenerEgresos(filtros);
    } catch {
      return []; // Backend aún no tiene este endpoint — retornar vacío
    }
  },

  registrarEgreso: async ({ fecha, sedeId, concepto, total, observaciones }) => {
    try {
      if (!fecha)   throw new Error("La fecha es obligatoria.");
      if (!sedeId)  throw new Error("Selecciona la sede.");
      if (!concepto?.trim()) throw new Error("El concepto es obligatorio.");

      const totalNum = parseFloat(total);
      if (isNaN(totalNum) || totalNum < 0)
        throw new Error("El total debe ser un valor válido.");

      const semana = getSemanaISO(new Date(fecha));
      const dia    = new Date(fecha).toLocaleDateString("es-CO", { weekday: "long" })
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
      return []; // Backend aún no tiene este endpoint — retornar vacío
    }
  },

  registrarCartera: async ({ fecha, sedeId, saldoDia }) => {
    try {
      if (!fecha)  throw new Error("La fecha es obligatoria.");
      if (!sedeId) throw new Error("Selecciona la sede.");

      const saldo = parseFloat(saldoDia);
      if (isNaN(saldo) || saldo < 0)
        throw new Error("El saldo del día debe ser un valor válido.");

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

  // ── ARQUEO SEMANAL ───────────────────────────────────────
  obtenerArqueo: async (semana) => {
    try {
      const sem = semana ?? getSemanaISO(new Date());
      return await contabilidadApi.obtenerArqueo(sem);
    } catch {
      return []; // Backend aún no tiene este endpoint — retornar vacío
    }
  },

  // ── PANEL GENERAL ─────────────────────────────────────────
  obtenerPanelGeneral: async (fecha) => {
    try {
      const f = fecha ?? new Date().toISOString().split("T")[0];
      return await contabilidadApi.obtenerPanelGeneral(f);
    } catch (error) {
      console.error("contabilidadService.obtenerPanelGeneral:", error);
      throw error;
    }
  },
};

export default contabilidadService;