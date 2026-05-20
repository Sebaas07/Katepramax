import clientesApi from "@/api/clientesApi";
import { obtenerSesion } from "@/utils/sessionHelper";

const clientesService = {
  obtenerClientes: async (filtros = {}) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }

      // Intentar obtener datos de la API
      const clientes = await clientesApi.obtenerClientes(filtros);
      return clientes;
    } catch (error) {
      console.error("Error en clientesService.obtenerClientes:", error);
      throw error;
    }
  },

  obtenerClientePorId: async (id) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }

      // Intentar obtener datos de la API
      const cliente = await clientesApi.obtenerClientePorId(id);
      return cliente;
    } catch (error) {
      console.error("Error en clientesService.obtenerClientePorId:", error);
      throw error;
    }
  },

  crearCliente: async (clienteData) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }

      // Validar datos mínimos requeridos (ajustar según el esquema)
      if (!clienteData.nombre || !clienteData.identificacion) {
        throw new Error("Faltan datos requeridos para crear el cliente");
      }

      // Intentar crear cliente vía API
      const nuevoCliente = await clientesApi.crearCliente(clienteData);
      return nuevoCliente;
    } catch (error) {
      console.error("Error en clientesService.crearCliente:", error);
      throw error;
    }
  },

  actualizarCliente: async (id, clienteData) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }

      // Validar que al menos haya algo para actualizar
      if (!id || !clienteData || Object.keys(clienteData).length === 0) {
        throw new Error("Se requiere ID y datos para actualizar");
      }

      // Intentar actualizar cliente vía API
      const clienteActualizado = await clientesApi.actualizarCliente(id, clienteData);
      return clienteActualizado;
    } catch (error) {
      console.error("Error en clientesService.actualizarCliente:", error);
      throw error;
    }
  },

  desactivarCliente: async (id) => {
    try {
      // Verificar si estamos autenticados
      const sesion = obtenerSesion();
      if (!sesion) {
        throw new Error("Usuario no autenticado");
      }

      // Validar ID
      if (!id) {
        throw new Error("Se requiere ID para desactivar el cliente");
      }

      // Intentar desactivar cliente vía API
      const resultado = await clientesApi.desactivarCliente(id);
      return resultado;
    } catch (error) {
      console.error("Error en clientesService.desactivarCliente:", error);
      throw error;
    }
  },
};

export default clientesService;