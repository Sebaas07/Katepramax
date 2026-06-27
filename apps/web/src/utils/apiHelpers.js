const errorMessages = {
  400: "Solicitud incorrecta",
  401: "No autorizado. Inicia sesión nuevamente.",
  403: "No tienes permisos para esta acción.",
  404: "Recurso no encontrado.",
  409: "Conflicto: ya existe un registro con estos datos.",
  422: "Datos de entrada inválidos.",
  429: "Demasiadas solicitudes. Inténtalo más tarde.",
  500: "Error interno del servidor. El equipo técnico ya fue notificado.",
  502: "Servicio no disponible temporalmente.",
  503: "Servicio en mantenimiento.",
  default: "Error de conexión. Verifica tu red.",
};

export const getApiErrorMessage = (error) => {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (typeof data === "string" && data.length > 0) {
    return data;
  }

  if (data?.message && typeof data.message === "string") {
    return data.message;
  }

  if (data?.error && typeof data.error === "string") {
    return data.error;
  }

  if (status && errorMessages[status]) {
    return errorMessages[status];
  }

  return error?.message || errorMessages.default;
};

// Sin export — no se importa en ningún módulo actualmente
const isNetworkError = (error) => !error?.response && !!error?.request;

// Sin export — no se importa en ningún módulo actualmente
const isServerError = (error) => error?.response?.status >= 500;

export const normalizeArrayResponse = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
};
