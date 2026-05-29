import clientesApi from "@/api/clientesApi";

/**
 * clientes.service.js — Katepramax
 * Lógica de negocio del lado cliente para el módulo de clientes.
 * Alineado con el schema Prisma real: nombre, telefono, limiteCredito, saldoDeuda, activo.
 * No incluye "identificacion" ni "email" — esos campos no existen en el modelo.
 */
const clientesService = {
  obtenerClientes: async (filtros = {}) => {
    try {
      const clientes = await clientesApi.obtenerClientes(filtros);
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
      // Validación alineada con el schema real
      if (!clienteData.nombre || !clienteData.nombre.trim()) {
        throw new Error("El nombre del cliente es obligatorio.");
      }
      const nuevoCliente = await clientesApi.crearCliente(clienteData);
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
};

export default clientesService;
