import inventarioApi from "@/api/inventarioApi";
import { getSemanaISO } from "@/utils/formatters";

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
      const { codigo, nombre, precioCosto, precioVenta, proveedorId } =
        producto;
      if (!codigo) throw new Error("El código es obligatorio.");
      if (!nombre) throw new Error("El nombre es obligatorio.");

      const payload = {
        codigo,
        descripcion: nombre,
        precioCosto: precioCosto !== undefined ? parseFloat(precioCosto) : 0,
        precioVenta: precioVenta !== undefined ? parseFloat(precioVenta) : 0,
      };

      if (proveedorId) payload.proveedorId = parseInt(proveedorId);

      return await inventarioApi.crearProducto(payload);
    } catch (e) {
      console.error("inventarioService.crearProducto:", e);
      throw e;
    }
  },

  actualizarProducto: async (codigo, datos) => {
    try {
      if (!codigo) throw new Error("Se requiere el código del producto.");
      return await inventarioApi.actualizarProducto(codigo, datos);
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

      return await inventarioApi.crearEntradaDiaria({
        sedeId: parseInt(sedeId),
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

  // Backend: GET /inventario → Admin, Bodega
  listarEntradas: async (filtros = {}) => {
    try {
      return await inventarioApi.listarInventario(filtros);
    } catch (e) {
      console.error("inventarioService.listarEntradas:", e);
      throw e;
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
    try {
      return await inventarioApi.obtenerStockBajo();
    } catch (e) {
      console.error("inventarioService.obtenerStockBajo:", e);
      throw e;
    }
  },

  // ─── Aliases para InventarioPage ─────────────────────────────────────────
  // InventarioPage usa estos nombres; internamente delegan a los métodos reales.
  listarMovimientos: async (filtros = {}) => {
    try {
      return await inventarioApi.listarInventario(filtros);
    } catch (e) {
      console.error("inventarioService.listarMovimientos:", e);
      throw e;
    }
  },

  registrarMovimiento: async ({
    tipo,
    productoId,
    cantidad,
    nota,
    sedeId,
    fecha,
  }) => {
    try {
      if (!productoId) throw new Error("Selecciona un producto.");
      if (!cantidad || cantidad <= 0)
        throw new Error("La cantidad debe ser mayor a 0.");
      if (!sedeId) throw new Error("Selecciona la sede.");
      if (!fecha) throw new Error("La fecha es obligatoria.");

      return await inventarioApi.crearEntradaDiaria({
        productoId,
        cantidadIngresada: parseInt(cantidad),
        sedeId: parseInt(sedeId),
        fecha,
        semana: getSemanaISO(new Date(fecha)),
        ...(nota ? { nota } : {}),
        ...(tipo ? { tipo } : {}),
      });
    } catch (e) {
      console.error("inventarioService.registrarMovimiento:", e);
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
