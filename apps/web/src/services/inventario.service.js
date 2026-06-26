import inventarioApi from "@/api/inventarioApi";
import { getSemanaISO } from "@/utils/formatters";
import { getApiErrorMessage, normalizeArrayResponse } from "@/utils/apiHelpers";
import { tieneAccesoTotal, obtenerSedeUsuario } from "@/utils/permisos";

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const inventarioService = {
  // ─── Productos ────────────────────────────────────────────────────────────
  obtenerProductos: async (filtros = {}) => {
    try {
      const f = { ...filtros };
      // Si no es Admin, filtrar por sede automáticamente
      if (!tieneAccesoTotal()) {
        const sedeIdUsuario = obtenerSedeUsuario();
        if (sedeIdUsuario) {
          f.sedeId = sedeIdUsuario;
        }
      }
      return await inventarioApi.obtenerProductos(f);
    } catch (error) {
      console.error("inventarioService.obtenerProductos:", error);
      throw new Error(getApiErrorMessage(error), { cause: error });
    }
  },

  obtenerProductoPorCodigo: async (codigo) => {
    try {
      if (!codigo) throw new Error("Se requiere el código del producto.");
      return await inventarioApi.obtenerProductoPorCodigo(codigo);
    } catch (e) {
      console.error("inventarioService.obtenerProductoPorCodigo:", e);
      throw e;
    }
  },

   crearProducto: async (producto) => {
    try {
      const {
        descripcion,
        departamento,
        precioCosto,
        precioVenta,
        precioMayoreo,
        porcentajeGanancia,
        stockMinimo,
        stockInicial,
        proveedorId,
        sedeId,
      } = producto;

      if (!descripcion) throw new Error("La descripción es obligatoria.");
      if (!departamento) throw new Error("Selecciona un departamento.");

      const costo = toNumber(precioCosto, 0);
      const venta = toNumber(precioVenta, 0);

      // Si no es Admin, usar sede del usuario
      const sedeFinalRaw = sedeId ?? (!tieneAccesoTotal() ? obtenerSedeUsuario() : undefined);
      const sedeFinal = sedeFinalRaw !== undefined && sedeFinalRaw !== null && sedeFinalRaw !== ""
        ? Number(sedeFinalRaw)
        : undefined;
      if (sedeFinalRaw !== undefined && sedeFinalRaw !== null && sedeFinalRaw !== "" && Number.isNaN(sedeFinal)) {
        throw new Error("sedeId inválido");
      }

      return await inventarioApi.crearProducto({
        descripcion,
        departamento,
        precioCosto: costo,
        precioVenta: venta,
        ...(precioMayoreo !== undefined && precioMayoreo !== "" ? { precioMayoreo: toNumber(precioMayoreo, 0) } : {}),
        porcentajeGanancia: toNumber(porcentajeGanancia, 0),
        stockMinimo: toNumber(stockMinimo, 0),
        stockInicial: stockInicial ? toNumber(stockInicial, 0) : undefined,
        proveedorId: proveedorId ? Number(proveedorId) : null,
        ...(sedeFinal !== undefined ? { sedeId: sedeFinal } : {}),
      });
    } catch (e) {
      console.error("inventarioService.crearProducto:", e);
      throw e;
    }
  },

  actualizarProducto: async (codigo, datos) => {
    try {
      if (!codigo) throw new Error("Se requiere el código del producto.");

      const payload = {
        descripcion: datos.descripcion,
        departamento: datos.departamento,
        precioCosto: datos.precioCosto,
        precioVenta: datos.precioVenta,
        stockMinimo: datos.stockMinimo,
        proveedorId: datos.proveedorId ? Number(datos.proveedorId) : null,
      };

      payload.precioMayoreo =
        datos.precioMayoreo !== undefined && datos.precioMayoreo !== ""
          ? toNumber(datos.precioMayoreo, 0)
          : undefined;
      payload.porcentajeGanancia = toNumber(datos.porcentajeGanancia, 0);
      if (datos.activo !== undefined) {
        payload.activo = datos.activo;
      }

      const keysToCheck = [
        "descripcion",
        "departamento",
        "precioCosto",
        "precioVenta",
        "stockMinimo",
        "proveedorId",
        "precioMayoreo",
        "porcentajeGanancia",
        "activo",
      ];
      for (const key of keysToCheck) {
        if (payload[key] === undefined || payload[key] === "") delete payload[key];
      }

      return await inventarioApi.actualizarProducto(codigo, payload);
    } catch (e) {
      console.error("inventarioService.actualizarProducto:", e);
      throw e;
    }
  },

  desactivarProducto: async (codigo) => {
    try {
      if (!codigo) throw new Error("Se requiere el código del producto.");
      return await inventarioApi.desactivarProducto(codigo);
    } catch (e) {
      console.error("inventarioService.desactivarProducto:", e);
      throw e;
    }
  },

  // ─── Entradas de Inventario (usando /inventario) ───────────────────────────
  // Backend: POST /inventario → Admin, Bodega
  registrarEntrada: async ({
    fecha,
    semana,
    sedeId,
    productoId,
    cantidadIngresada,
    costo,
  }) => {
    try {
      if (!fecha) throw new Error("La fecha es obligatoria.");
      if (!sedeId) throw new Error("Selecciona la sede.");
      if (!productoId) throw new Error("Selecciona un producto.");
      if (!cantidadIngresada || cantidadIngresada <= 0)
        throw new Error("La cantidad debe ser mayor a 0.");

      // Si no es Admin, usar sede del usuario
      const sedeFinal = sedeId ?? (!tieneAccesoTotal() ? obtenerSedeUsuario() : undefined);

      return await inventarioApi.crearEntradaDiaria({
        sedeId: parseInt(sedeFinal),
        productoId,
        cantidadIngresada: parseInt(cantidadIngresada),
        fecha,
        semana: semana ?? getSemanaISO(new Date(fecha)),
        costo: costo !== undefined ? parseFloat(costo) : undefined,
      });
    } catch (e) {
      console.error("inventarioService.registrarEntrada:", e);
      throw e;
    }
  },

  listarEntradas: async (filtros = {}) => {
    try {
      const f = { ...filtros };
      // Si no es Admin, filtrar por sede automáticamente
      if (!tieneAccesoTotal()) {
        const sedeIdUsuario = obtenerSedeUsuario();
        if (sedeIdUsuario) {
          f.sedeId = sedeIdUsuario;
        }
      }
      const data = await inventarioApi.listarInventario(f);
      return normalizeArrayResponse(data);
    } catch (error) {
      console.error("inventarioService.listarEntradas:", error);
      throw error;
    }
  },

  // Backend: PATCH /inventario/:id → Admin, Bodega
  editarEntrada: async (id, datos) => {
    try {
      if (!id) throw new Error("Se requiere el ID del registro.");
      return await inventarioApi.editarInventario(id, datos);
    } catch (e) {
      console.error("inventarioService.editarEntrada:", e);
      throw e;
    }
  },

  // Backend: DELETE /inventario/:id → solo Admin
  eliminarEntrada: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del registro.");
      return await inventarioApi.eliminarInventario(id);
    } catch (e) {
      console.error("inventarioService.eliminarEntrada:", e);
      throw e;
    }
  },

  // ─── Stock Bajo ───────────────────────────────────────────────────────────
  obtenerStockBajo: async () => {
    const response = await inventarioApi.obtenerStockBajo();
    return response.data;
  },

  obtenerSedes: async () => {
    try {
      return await inventarioApi.obtenerSedes();
    } catch (error) {
      console.error("inventarioService.obtenerSedes:", error);
      throw new Error(getApiErrorMessage(error), { cause: error });
    }
  },
};

export default inventarioService;