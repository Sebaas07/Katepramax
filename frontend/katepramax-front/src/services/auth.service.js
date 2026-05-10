import { postLogin, getMe } from "../api/authApi";

/**
 * Inicia sesión con usuario y clave
 * @param {string} usuario - Nombre de usuario
 * @param {string} clave - Contraseña
 * @returns {Promise<Object>} Resultado del inicio de sesión
 */
export const iniciarSesion = async (usuario, clave) => {
  try {
    const response = await postLogin({ usuario, clave });
    return {
      exitoso: true,
      datos: response.data,
    };
  } catch (error) {
    console.error("Error en inicio de sesión:", error);
    return {
      exitoso: false,
      mensaje: error.response?.data?.mensaje || "Error de autenticación",
    };
  }
};

/**
 * Obtiene los datos del usuario autenticado
 * @returns {Promise<Object>} Datos del usuario
 */
export const obtenerUsuarioActual = async () => {
  try {
    const response = await getMe();
    return {
      exitoso: true,
      datos: response.data,
    };
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return {
      exitoso: false,
      mensaje: error.response?.data?.mensaje || "Error al obtener usuario",
    };
  }
};