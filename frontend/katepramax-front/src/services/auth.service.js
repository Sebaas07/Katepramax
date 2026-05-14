import { postLogin, getMe } from "../api/authApi";
import { USUARIOS_MOCK } from "../mocks/datos.mock";
import { guardarTokens, guardarSesion } from "@/utils/sessionHelper";

/**
 * Genera un token JWT mock para desarrollo
 */
const generarTokenMock = (usuario) => {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    id: usuario.id,
    usuario: usuario.usuario,
    rol: usuario.rol,
    sedeId: usuario.sedeId,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }));
  const signature = btoa("mock-signature");
  return `${header}.${payload}.${signature}`;
};

/**
 * Inicia sesión con usuario y clave
 * @param {string} usuario - Nombre de usuario
 * @param {string} clave - Contraseña
 * @returns {Promise<Object>} Resultado del inicio de sesión
 */
export const iniciarSesion = async (usuario, clave) => {
  try {
    const response = await postLogin({ usuario, clave });
    const datos = response.data;
    guardarTokens(datos.token, datos.refreshToken);
    guardarSesion(datos.usuario);
    return {
      exitoso: true,
      datos,
    };
  } catch (error) {
    console.warn("Backend no disponible, intentando login mock:", error.message);
    
    const usuarioMock = USUARIOS_MOCK.find(
      (u) => u.usuario === usuario && u.clave === clave
    );
    
    if (usuarioMock) {
      const usuarioData = {
        id: usuarioMock.id,
        nombreCompleto: usuarioMock.nombreCompleto,
        usuario: usuarioMock.usuario,
        rol: usuarioMock.rol,
        sedeId: usuarioMock.sedeId,
        sede: usuarioMock.sede,
        esBogota: usuarioMock.esBogota,
      };
      const token = generarTokenMock(usuarioMock);
      const datos = {
        token,
        refreshToken: token.replace(/\./g, ""),
        usuario: usuarioData,
      };
      guardarTokens(datos.token, datos.refreshToken);
      guardarSesion(usuarioData);
      return { exitoso: true, datos };
    }
    
    return {
      exitoso: false,
      mensaje: "Usuario o contraseña incorrectos",
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