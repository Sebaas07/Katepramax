import contabilidadApi from "@/api/contabilidadApi";
import { getSemanaISO } from "@/utils/formatters";
import { tieneAccesoTotal, obtenerSedeUsuario } from "@/utils/permisos";

const normalizarSemana = (valor) => {
  const numero = Number.parseInt(valor, 10);
  return Number.isNaN(numero)
    ? getSemanaISO(new Date())
    : Math.min(53, Math.max(1, numero));
};

const contabilidadService = {
  // ── INGRESOS ──────────────────────────────────────────────
  obtenerIngresos: async (filtros = {}) => {
    try {
      const f = { ...filtros };
      // Si no es Admin, filtrar por sede automáticamente
      if (!tieneAccesoTotal()) {
        const sedeIdUsuario = obtenerSedeUsuario();
        if (sedeIdUsuario) {
          f.sedeId = sedeIdUsuario;
        }
      }
      return await contabilidadApi.obtenerIngresos(f);
    } catch {
      return [];
    }
  },

  registrarIngreso: async (datos) => {
    if (!datos.fecha) throw new Error("La fecha es obligatoria.");
    if (!datos.sedeId) {
      const sedeIdUsuario = obtenerSedeUsuario();
      if (sedeIdUsuario) datos.sedeId = sedeIdUsuario;
      else throw new Error("Selecciona la sede.");
    }

    const ef = Number(datos.efectivo ?? 0);
    const cu = Number(datos.cuentas ?? 0);
    if (ef <= 0 && cu <= 0)
      throw new Error("Ingresa al menos un valor en efectivo o cuentas.");

    return contabilidadApi.registrarIngreso({
      ...datos,
      efectivo: ef,
      cuentas: cu,
      total: ef + cu,
    });
  },

  editarIngreso: async (id, datos) => {
    if (!id) throw new Error("Se requiere el ID del ingreso.");
    const payload = { ...datos };
    if (payload.efectivo !== undefined || payload.cuentas !== undefined) {
      payload.total =
        Number(payload.efectivo ?? 0) + Number(payload.cuentas ?? 0);
    }
    return contabilidadApi.editarIngreso(id, payload);
  },

  eliminarIngreso: async (id) => {
    if (!id) throw new Error("Se requiere el ID del ingreso.");
    return contabilidadApi.eliminarIngreso(id);
  },

  obtenerResumenSemanalIngresos: async (semana) => {
    try {
      return await contabilidadApi.obtenerResumenSemanalIngresos(
        normalizarSemana(semana),
      );
    } catch {
      return {
        porSede: [],
        totalGeneral: { efectivo: 0, cuentas: 0, total: 0 },
      };
    }
  },

  obtenerTotalesDiaIngresos: async (semana) => {
    try {
      return await contabilidadApi.obtenerTotalesDiaIngresos(
        normalizarSemana(semana),
      );
    } catch {
      return [];
    }
  },

  // ── EGRESOS ───────────────────────────────────────────────
  obtenerEgresos: async (filtros = {}) => {
    try {
      const f = { ...filtros };
      // Si no es Admin, filtrar por sede automáticamente
      if (!tieneAccesoTotal()) {
        const sedeIdUsuario = obtenerSedeUsuario();
        if (sedeIdUsuario) {
          f.sedeId = sedeIdUsuario;
        }
      }
      return await contabilidadApi.obtenerEgresos(f);
    } catch {
      return [];
    }
  },

  registrarEgreso: async (datos) => {
    if (!datos.fecha) throw new Error("La fecha es obligatoria.");
    if (!datos.sedeId) {
      const sedeIdUsuario = obtenerSedeUsuario();
      if (sedeIdUsuario) datos.sedeId = sedeIdUsuario;
      else throw new Error("Selecciona la sede.");
    }
    if (!String(datos.concepto ?? "").trim())
      throw new Error("El concepto es obligatorio.");

    const total = Number(datos.total ?? 0);
    if (total <= 0) throw new Error("Ingresa un total mayor a cero.");

    return contabilidadApi.registrarEgreso({
      ...datos,
      concepto: String(datos.concepto).trim(),
      total,
      observacion: datos.observacion ?? datos.observaciones,
    });
  },

  editarEgreso: async (id, datos) => {
    if (!id) throw new Error("Se requiere el ID del egreso.");
    return contabilidadApi.editarEgreso(id, {
      ...datos,
      observacion: datos.observacion ?? datos.observaciones,
    });
  },

  eliminarEgreso: async (id) => {
    if (!id) throw new Error("Se requiere el ID del egreso.");
    return contabilidadApi.eliminarEgreso(id);
  },

  obtenerResumenSemanalEgresos: async (semana) => {
    try {
      return await contabilidadApi.obtenerResumenSemanalEgresos(
        normalizarSemana(semana),
      );
    } catch {
      return { porSede: [], totalGeneral: 0 };
    }
  },

  obtenerResumenConceptoEgresos: async (semana) => {
    try {
      return await contabilidadApi.obtenerResumenConceptoEgresos(
        normalizarSemana(semana),
      );
    } catch {
      return [];
    }
  },

  obtenerTotalesDiaEgresos: async (semana) => {
    try {
      return await contabilidadApi.obtenerTotalesDiaEgresos(
        normalizarSemana(semana),
      );
    } catch {
      return [];
    }
  },

  // ── CARTERA ───────────────────────────────────────────────
  obtenerCartera: async (filtros = {}) => {
    try {
      const f = { ...filtros };
      // Si no es Admin, filtrar por sede automáticamente
      if (!tieneAccesoTotal()) {
        const sedeIdUsuario = obtenerSedeUsuario();
        if (sedeIdUsuario) {
          f.sedeId = sedeIdUsuario;
        }
      }
      return await contabilidadApi.obtenerCartera(f);
    } catch {
      return [];
    }
  },

  registrarCartera: async (datos) => {
    if (!datos.fecha) throw new Error("La fecha es obligatoria.");
    if (!datos.sedeId) {
      const sedeIdUsuario = obtenerSedeUsuario();
      if (sedeIdUsuario) datos.sedeId = sedeIdUsuario;
      else throw new Error("Selecciona la sede.");
    }

    const saldo = Number(datos.saldoDia ?? 0);
    if (saldo <= 0) throw new Error("Ingresa un saldo mayor a cero.");

    return contabilidadApi.registrarCartera({
      ...datos,
      saldoDia: saldo,
    });
  },

  editarCartera: async (id, datos) => {
    if (!id) throw new Error("Se requiere el ID de cartera.");
    return contabilidadApi.editarCartera(id, datos);
  },

  eliminarCartera: async (id) => {
    if (!id) throw new Error("Se requiere el ID de cartera.");
    return contabilidadApi.eliminarCartera(id);
  },

  // ── PROVEEDORES ────────────────────────────────────────────
  // Catálogo de proveedores (para selectores) — NO usar para la tabla de abonos.
  obtenerProveedores: async (filtros = {}) => {
    try {
      return await contabilidadApi.obtenerProveedores(filtros);
    } catch {
      return [];
    }
  },

  // Abonos/pagos a proveedores (lo que se muestra en la tabla de la tab "Abonos")
  listarAbonos: async (filtros = {}) => {
    try {
      return await contabilidadApi.listarAbonos(filtros);
    } catch {
      return [];
    }
  },

  registrarPagoProveedor: async (datos) => {
    if (!datos.fecha) throw new Error("La fecha es obligatoria.");
    if (!datos.sedeId) {
      const sedeIdUsuario = obtenerSedeUsuario();
      if (sedeIdUsuario) datos.sedeId = sedeIdUsuario;
      else throw new Error("Selecciona la sede.");
    }
    if (!datos.proveedorId) throw new Error("Selecciona el proveedor.");

    const valor = Number(datos.valorPagado ?? 0);
    if (valor <= 0) throw new Error("Ingresa un valor de abono mayor a cero.");

    return contabilidadApi.registrarPagoProveedor({
      ...datos,
      valorPagado: valor,
    });
  },

  editarPagoProveedor: async (id, datos) => {
    if (!id) throw new Error("Se requiere el ID del abono.");
    return contabilidadApi.editarPagoProveedor(id, datos);
  },

  eliminarPagoProveedor: async (id) => {
    if (!id) throw new Error("Se requiere el ID del abono.");
    return contabilidadApi.eliminarPagoProveedor(id);
  },

  obtenerResumenProveedores: async (semana) => {
    try {
      return await contabilidadApi.obtenerResumenProveedores(
        normalizarSemana(semana),
      );
    } catch {
      return [];
    }
  },

  obtenerResumenSedeAbonos: async (semana) => {
    try {
      return await contabilidadApi.obtenerResumenSedeAbonos(
        normalizarSemana(semana),
      );
    } catch {
      return [];
    }
  },

  // ── ARQUEO ────────────────────────────────────────────────
  obtenerArqueo: async (semana) => {
    try {
      const sem = normalizarSemana(semana ?? getSemanaISO(new Date()));
      return await contabilidadApi.obtenerArqueo(sem);
    } catch {
      return null;
    }
  },

  obtenerPanelGeneral: async (fecha) => {
    try {
      const f = {};
      // Si no es Admin, filtrar por sede automáticamente
      if (!tieneAccesoTotal()) {
        const sedeIdUsuario = obtenerSedeUsuario();
        if (sedeIdUsuario) {
          f.sedeId = sedeIdUsuario;
        }
      }
      return await contabilidadApi.obtenerPanelGeneral(
        fecha ? { ...f, fecha } : f,
      );
    } catch {
      return null;
    }
  },

  obtenerInventarioSemanal: async (semana) => {
    try {
      return await contabilidadApi.obtenerInventarioSemanal(
        normalizarSemana(semana),
      );
    } catch {
      return [];
    }
  },
};

export default contabilidadService;
