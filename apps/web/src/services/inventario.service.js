import inventarioApi from "@/api/inventarioApi";
import { getSemanaISO } from "@/utils/formatters";

const inventarioService = {
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
  editarEntrada: async (id, datos) => {
    try {
      if (!id) throw new Error("Se requiere el ID del registro.");
      return await inventarioApi.editarEntrada(id, datos);
    } catch (e) { console.error("inventarioService.editarEntrada:", e); throw e; }
  },
  eliminarEntrada: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del registro.");
      return await inventarioApi.eliminarEntrada(id);
    } catch (e) { console.error("inventarioService.eliminarEntrada:", e); throw e; }
  },
  resumenSemanal: async (semana) => {
    try {
      const sem = semana ?? getSemanaISO(new Date());
      return await inventarioApi.resumenSemanal(sem);
    } catch (e) { console.error("inventarioService.resumenSemanal:", e); throw e; }
  },
};
export default inventarioService;
