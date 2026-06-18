import inventarioApi from "@/api/inventarioApi";
import { getSemanaISO } from "@/utils/formatters";

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const inventarioService = {
  // ─── Productos ────────────────────────────────────────────────────────────
  obtenerProductos: async (filtros = {}) => {
    try {
      return await inventarioApi.obtenerProductos(filtros);
    } catch (e) {
      console.error("inventarioService.obtenerProductos:", e);
      throw e;
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
        codigo,
        nombre,
        descripcion,
        departamento,
        precioDetal,
        precioCosto,
        stockMinimo,
        sedeId,
        proveedorId,
      } = producto;

      if (!codigo) throw new Error("El código es obligatorio.");
      if (!nombre && !descripcion) throw new Error("El nombre es obligatorio.");
      if (!departamento) throw new Error("Selecciona un departamento.");

      return await inventarioApi.crearProducto({
        codigo,
        descripcion: nombre || descripcion,
        departamento,
        precioCosto: toNumber(precioCosto ?? precioDetal, 0),
        precioVenta: toNumber(precioDetal, 0),
        stockMinimo: toNumber(stockMinimo, 0),
        sedeId: sedeId ? Number(sedeId) : undefined,
        proveedorId: proveedorId ? Number(proveedorId) : undefined,
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
        descripcion: datos.nombre || datos.descripcion,
        departamento: datos.departamento,
        precioVenta: datos.precioDetal ?? datos.precioVenta,
        stockMinimo: datos.stockMinimo,
        sedeId: datos.sedeId,
        proveedorId: datos.proveedorId ? Number(datos.proveedorId) : null,
      };

      if (payload.descripcion === undefined) delete payload.descripcion;
      if (payload.departamento === undefined) delete payload.departamento;
      if (payload.precioVenta === undefined) delete payload.precioVenta;
      if (payload.stockMinimo === undefined) delete payload.stockMinimo;
      if (payload.sedeId === undefined || payload.sedeId === "") delete payload.sedeId;

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

  // ─── Entradas ───────────────────────────────────────────────────────────
  registrarEntrada: async ({ fecha, semana, sedeId, productoId, cantidadIngresada, costo }) => {
    try {
      if (!fecha) throw new Error("La fecha es obligatoria.");
      if (!sedeId) throw new Error("Selecciona la sede.");
      if (!productoId) throw new Error("Selecciona un producto.");
      if (!cantidadIngresada || cantidadIngresada <= 0) throw new Error("La cantidad debe ser mayor a 0.");
      if (costo === undefined || costo === null || costo < 0) throw new Error("El costo debe ser un valor válido.");
      const semanaFinal = semana ?? getSemanaISO(new Date(fecha));
      return await inventarioApi.crearEntrada({
        fecha,
        semana: semanaFinal,
        sedeId: parseInt(sedeId),
        productoId,
        cantidadIngresada: parseInt(cantidadIngresada),
        costo: parseFloat(costo),
      });
    } catch (e) {
      console.error("inventarioService.registrarEntrada:", e);
      throw e;
    }
  },

  listarEntradas: async (filtros = {}) => {
    try {
      return await inventarioApi.listarEntradas(filtros);
    } catch (e) {
      console.error("inventarioService.listarEntradas:", e);
      throw e;
    }
  },

  editarEntrada: async (id, datos) => {
    try {
      if (!id) throw new Error("Se requiere el ID del registro.");
      return await inventarioApi.editarEntrada(id, datos);
    } catch (e) {
      console.error("inventarioService.editarEntrada:", e);
      throw e;
    }
  },

  eliminarEntrada: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del registro.");
      return await inventarioApi.eliminarEntrada(id);
    } catch (e) {
      console.error("inventarioService.eliminarEntrada:", e);
      throw e;
    }
  },

  // ─── Movimientos ───────────────────────────────────────────────────────
  registrarMovimiento: async ({ tipo, productoId, cantidad, nota, sedeId, fecha }) => {
    try {
      if (!tipo) throw new Error("Selecciona el tipo de movimiento.");
      if (!productoId) throw new Error("Selecciona un producto.");
      if (!cantidad || cantidad === 0) throw new Error("La cantidad es obligatoria.");
      if (!sedeId) throw new Error("Selecciona la sede.");
      const fechaFinal = fecha ?? new Date().toISOString().split("T")[0];
      return await inventarioApi.crearMovimiento({
        tipo,
        productoId,
        cantidad: parseInt(cantidad),
        nota: nota || "",
        sedeId: parseInt(sedeId),
        fecha: fechaFinal,
      });
    } catch (e) {
      console.error("inventarioService.registrarMovimiento:", e);
      throw e;
    }
  },

  listarMovimientos: async (filtros = {}) => {
    try {
      return await inventarioApi.listarMovimientos(filtros);
    } catch (e) {
      console.error("inventarioService.listarMovimientos:", e);
      throw e;
    }
  },

  // ─── Stock Bajo ─────────────────────────────────────────────────────────
  obtenerStockBajo: async () => {
    try {
      return await inventarioApi.obtenerStockBajo();
    } catch (e) {
      console.error("inventarioService.obtenerStockBajo:", e);
      throw e;
    }
  },

  // ─── Resumen ────────────────────────────────────────────────────────────
  resumenSemanal: async (semana) => {
    try {
      const sem = semana ?? getSemanaISO(new Date());
      return await inventarioApi.resumenSemanal(sem);
    } catch (e) {
      console.error("inventarioService.resumenSemanal:", e);
      throw e;
    }
  },
};

export default inventarioService;
