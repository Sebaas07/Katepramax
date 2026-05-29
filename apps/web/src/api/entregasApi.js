import { clienteApi } from "./axiosConfig";

/**
 * entregasApi.js — Katepramax
 * Sin Cloudinary. Sin subida de fotos.
 * Estados: Pendiente | EnRuta | Entregado | Fallido
 */
const entregasApi = {
  obtenerMisEntregas: async (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") params.append(k, v);
    });
    const qs = params.toString();
    const response = await clienteApi.get(
      qs ? `/asignaciones/mis-entregas?${qs}` : "/asignaciones/mis-entregas"
    );
    return response.data;
  },

  marcarSalida: async (asignacionId) => {
    const response = await clienteApi.patch(`/asignaciones/${asignacionId}/estado`, {
      nuevoEstado: "EnRuta",
    });
    return response.data;
  },

  confirmarEntrega: async (asignacionId, { montoCobrado, metodoPago, observacionesEntrega }) => {
    const response = await clienteApi.patch(`/asignaciones/${asignacionId}/estado`, {
      nuevoEstado: "Entregado",
      montoCobrado: parseFloat(montoCobrado),
      metodoPago,
      ...(observacionesEntrega ? { observacionesEntrega } : {}),
    });
    return response.data;
  },

  registrarFallo: async (asignacionId, observacionesEntrega) => {
    const response = await clienteApi.patch(`/asignaciones/${asignacionId}/estado`, {
      nuevoEstado: "Fallido",
      observacionesEntrega,
    });
    return response.data;
  },
};

export default entregasApi;
