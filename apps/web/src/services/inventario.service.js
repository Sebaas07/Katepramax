import inventarioApi from "@/api/inventarioApi";
import { getSemanaISO } from "@/utils/formatters";

const inventarioService = {
  // Productos
  obtenerProductos: async (filtros = {}) => {
    try { return await inventarioApi.obtenerProductos(filtros); }
    catch (e) { console.error("inventarioService.obtenerProductos:", e); throw e; }
  },

  obtenerProductoPorCodigo: async (codigo) => {
    try {
      if (!codigo) throw new Error("Se requiere el código del producto.");
      return await inventarioApi.obtenerProductoPorCodigo(codigo);
    } catch (e) { console.error("inventarioService.obtenerProductoPorCodigo:", e); throw e; }
  },

  crearProducto: async (datos) => {
    try {
      if (!datos.codigo) throw new Error("El código es obligatorio.");
      if (!datos.nombre) throw new Error("El nombre es obligatorio.");
      return await inventarioApi.crearProducto(datos);
    } catch (e) { console.error("inventarioService.crearProducto:", e); throw e; }
  },

  actualizarProducto: async (codigo, datos) => {
    try {
      if (!codigo) throw new Error("Se requiere el código del producto.");
      return await inventarioApi.actualizarProducto(codigo, datos);
    } catch (e) { console.error("inventarioService.actualizarProducto:", e); throw e; }
  },

  desactivarProducto: async (codigo) => {
    try {
      if (!codigo) throw new Error("Se requiere el código del producto.");
      return await inventarioApi.desactivarProducto(codigo);
    } catch (e) { console.error("inventarioService.desactivarProducto:", e); throw e; }
  },

  // Entradas
  registrarEntrada: async ({ fecha, semana, sedeId, productoId, cantidadIngresada, costo }) => {
    try {
      if (!fecha)   throw new Error("La fecha es obligatoria.");
      if (!sedeId)  throw new Error("Selecciona la sede.");
      if (!productoId) throw new Error("Selecciona un producto.");
      if (!cantidadIngresada || cantidadIngresada <= 0) throw new Error("La cantidad debe ser mayor a 0.");
      if (costo === undefined || costo === null || costo < 0) throw new Error("El costo debe ser un valor válido.");
      const semanaFinal = semana ?? getSemanaISO(new Date(fecha));
      return await inventarioApi.crearEntrada({
        fecha, semana: semanaFinal, sedeId: parseInt(sedeId),
        productoId, cantidadIngresada: parseInt(cantidadIngresada), costo: parseFloat(costo),
      });
    } catch (e) { console.error("inventarioService.registrarEntrada:", e); throw e; }
  },

  listarEntradas: async (filtros = {}) => {
    try { return await inventarioApi.listarEntradas(filtros); }
    catch (e) { console.error("inventarioService.listarEntradas:", e); throw e; }
  },

  // Movimientos (Sprint 2)
  registrarMovimiento: async ({ tipo, productoId, cantidad, nota, sedeId, fecha }) => {
    try {
      if (!tipo) throw new Error("El tipo de movimiento es obligatorio.");
      if (!productoId) throw new Error("Selecciona un producto.");
      if (!cantidad || Math.abs(cantidad) === 0) throw new Error("La cantidad es obligatoria.");
      if (!sedeId) throw new Error("Selecciona una sede.");
      const fechaFinal = fecha ?? new Date().toISOString().split("T")[0];
      return await inventarioApi.registrarMovimiento({
        tipo,
        productoId,
        cantidad: parseInt(cantidad),
        nota: nota || "",
        sedeId: parseInt(sedeId),
        fecha: fechaFinal,
      });
    } catch (e) { console.error("inventarioService.registrarMovimiento:", e); throw e; }
  },

  listarMovimientos: async (filtros = {}) => {
    try { return await inventarioApi.listarMovimientos(filtros); }
    catch (e) { console.error("inventarioService.listarMovimientos:", e); throw e; }
  },

  obtenerMovimientoPorId: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del movimiento.");
      return await inventarioApi.obtenerMovimientoPorId(id);
    } catch (e) { console.error("inventarioService.obtenerMovimientoPorId:", e); throw e; }
  },

  // Stock bajo
  obtenerStockBajo: async () => {
    try { return await inventarioApi.obtenerStockBajo(); }
    catch (e) { console.error("inventarioService.obtenerStockBajo:", e); throw e; }
  },

  resumenSemanal: async (semana) => {
    try {
      const sem = semana ?? getSemanaISO(new Date());
      return await inventarioApi.resumenSemanal(sem);
    } catch (e) { console.error("inventarioService.resumenSemanal:", e); throw e; }
  },
};
export default inventarioService;
