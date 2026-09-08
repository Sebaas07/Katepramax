import clientesApi from "@/api/clientesApi";
import { tieneAccesoTotal, obtenerSedeUsuario } from "@/utils/permisos";

/**
 * clientes.service.js — Katepramax
 * Lógica de negocio del lado cliente para el módulo de clientes.
 * Reglas de sede:
 * - Admin: acceso total (no filtra por sede)
 * - Bodega/AdminBogota/Oficinista: el backend aplica familia de sedes
 * - Entregador: el backend filtra por sedes asignadas + solo con deuda
 */
const clientesService = {
  obtenerClientes: async (filtros = {}) => {
    try {
      const f = { ...filtros };
      // No forzar sedeId en el cliente: el backend resuelve familia / sedes del entregador.
      // Solo Admin puede pedir sedeId explícito; para el resto el API ignora o restringe.
      if (!tieneAccesoTotal() && f.sedeId == null) {
        // Mantener compatibilidad: si alguien pasa sede en UI admin, ok.
        // Para no-Admin sin sede en filtros, no inyectamos sedeId del usuario aquí
        // para no romper el filtro de familia del backend (Bogotá + oficinas).
        void obtenerSedeUsuario;
      }
      const clientes = await clientesApi.obtenerClientes(f);
      return clientes;
    } catch (error) {
      console.error("Error en clientesService.obtenerClientes:", error);
      throw error;
    }
  },

  obtenerClientePorId: async (id) => {
    try {
      const cliente = await clientesApi.obtenerClientePorId(id);
      return cliente;
    } catch (error) {
      console.error("Error en clientesService.obtenerClientePorId:", error);
      throw error;
    }
  },

  crearCliente: async (clienteData) => {
    try {
      if (!clienteData.nombre || !clienteData.nombre.trim()) {
        throw new Error("El nombre del cliente es obligatorio.");
      }
      const payload = {
        nombre: clienteData.nombre,
        telefono: clienteData.telefono || undefined,
        sedeId: clienteData.sedeId !== undefined ? clienteData.sedeId : undefined,
        limiteCredito:
          clienteData.limiteCredito !== undefined
            ? clienteData.limiteCredito
            : undefined,
        saldoDeuda:
          clienteData.saldoDeuda !== undefined
            ? clienteData.saldoDeuda
            : undefined,
      };
      Object.keys(payload).forEach(
        (k) => payload[k] === undefined && delete payload[k],
      );
      const nuevoCliente = await clientesApi.crearCliente(payload);
      return nuevoCliente;
    } catch (error) {
      console.error("Error en clientesService.crearCliente:", error);
      throw error;
    }
  },

  actualizarCliente: async (id, clienteData) => {
    try {
      if (!id) throw new Error("Se requiere el ID del cliente.");
      if (!clienteData || Object.keys(clienteData).length === 0) {
        throw new Error("No hay datos para actualizar.");
      }
      const clienteActualizado = await clientesApi.actualizarCliente(id, clienteData);
      return clienteActualizado;
    } catch (error) {
      console.error("Error en clientesService.actualizarCliente:", error);
      throw error;
    }
  },

  desactivarCliente: async (id) => {
    try {
      if (!id) throw new Error("Se requiere el ID del cliente.");
      const resultado = await clientesApi.desactivarCliente(id);
      return resultado;
    } catch (error) {
      console.error("Error en clientesService.desactivarCliente:", error);
      throw error;
    }
  },

  abonarCliente: async (id, monto) => {
    try {
      if (!id) throw new Error("Se requiere el ID del cliente.");
      const valor = parseFloat(monto);
      if (isNaN(valor) || valor <= 0) {
        throw new Error("El monto del abono debe ser mayor a 0.");
      }
      const clienteActualizado = await clientesApi.abonarCliente(id, valor);
      return clienteActualizado;
    } catch (error) {
      console.error("Error en clientesService.abonarCliente:", error);
      throw error;
    }
  },
};

export default clientesService;
