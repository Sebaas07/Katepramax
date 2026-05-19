import { postLogin, getMe } from "../api/authApi";
import { USUARIOS_MOCK } from "../mocks/datos.mock";
import { guardarTokens, guardarSesion, cerrarSesion } from "@/utils/sessionHelper";

const generarTokenMock = (usuario) => {
  const header    = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload   = btoa(JSON.stringify({
    id: usuario.id,
    usuario: usuario.usuario,
    rol: usuario.rol,
    sedeId: usuario.sedeId,
    exp: Math.floor(Date.now() / 1000) + 3600,
  }));
  const signature = btoa("mock-signature");
  return `${header}.${payload}.${signature}`;
};

export const iniciarSesion = async (usuario, contrasena) => {
  try {
    const response = await postLogin({ usuario, contrasena });
    const datos    = response.data;

    guardarTokens(datos.accessToken, datos.refreshToken);
    guardarSesion(datos.user);

    return { exitoso: true, datos: datos.user };

  } catch (error) {
    console.warn("Backend no disponible, intentando login mock:", error.message);

    const usuarioMock = USUARIOS_MOCK.find(
      (u) => u.usuario === usuario && u.contrasena === contrasena
    );

    if (usuarioMock) {
      const usuarioData = {
        id:             usuarioMock.id,
        nombreCompleto: usuarioMock.nombreCompleto,
        usuario:        usuarioMock.usuario,
        rol:            usuarioMock.rol,
        sedeId:         usuarioMock.sedeId,
        sede:           usuarioMock.sede,
        esBogota:       usuarioMock.esBogota,
      };
      const token = generarTokenMock(usuarioMock);
      guardarTokens(token, token.replace(/\./g, ""));
      guardarSesion(usuarioData);
      return { exitoso: true, datos: usuarioData };
    }

    return { exitoso: false, mensaje: "Usuario o contraseña incorrectos" };
  }
};

export const obtenerUsuarioActual = async () => {
  try {
    const response = await getMe();
    return { exitoso: true, datos: response.data };
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return {
      exitoso: false,
      mensaje: error.response?.data?.mensaje || "Error al obtener usuario",
    };
  }
};
export const cerrarSesionUsuario = () => {
  cerrarSesion();
  return { exitoso: true, mensaje: "Sesión cerrada correctamente" };

};