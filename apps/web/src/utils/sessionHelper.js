import Cookies from "js-cookie";

const COOKIE_OPTIONS = {
  expires: 7,
  sameSite: "Strict",
};

// ─── Tokens (cookies) ─────────────────────────────────────────────────────────

export const guardarTokens = (token, refreshToken) => {
  Cookies.set("token", token, COOKIE_OPTIONS);
  Cookies.set("refreshToken", refreshToken, COOKIE_OPTIONS);
};

export const obtenerAccessToken = () => Cookies.get("token");
export const obtenerRefreshToken = () => Cookies.get("refreshToken");

const eliminarTokens = () => {
  Cookies.remove("token");
  Cookies.remove("refreshToken");
};

// ─── Sesión del usuario (localStorage) ───────────────────────────────────────
// Guarda: { id, nombreCompleto, usuario, rol, sedeId, sede, esBogota }
// esBogota viene del backend en el JWT — indica si es Bodega de Bogotá

export const guardarSesion = (usuario) => {
  localStorage.setItem("logueado", "true");
  localStorage.setItem("usuario", JSON.stringify(usuario));
};

export const obtenerSesion = () => {
  const usuario = localStorage.getItem("usuario");
  return usuario ? JSON.parse(usuario) : null;
};

export const estaLogueado = () =>
  localStorage.getItem("logueado") === "true" && !!obtenerAccessToken();

export const actualizarSesion = (datosNuevos) => {
  const actual = obtenerSesion();
  if (actual) {
    localStorage.setItem(
      "usuario",
      JSON.stringify({ ...actual, ...datosNuevos })
    );
  }
};

export const obtenerRol = () => {
  const sesion = obtenerSesion();
  return sesion ? sesion.rol : null;
};

/**
 * Verifica si el usuario tiene alguno de los roles indicados.
 * Uso: tieneRol("Admin", "Bodega")
 */
export const tieneRol = (...roles) => {
  const rol = obtenerRol();
  return roles.includes(rol);
};

/**
 * Verifica si el usuario es Bodega de la sede Bogotá.
 * Este es el único perfil que puede:
 *  - Modificar precios (llegada, detal, mayoreo)
 *  - Crear envíos de distribución a otras sedes
 * El campo esBogota lo incluye el backend en el JWT.
 */
export const esBodegaBogota = () => {
  const sesion = obtenerSesion();
  return sesion?.rol === "Bodega" && sesion?.esBogota === true;
};

/**
 * Cierra la sesión completamente.
 * Elimina tokens y datos del usuario.
 */
export const cerrarSesion = () => {
  localStorage.removeItem("logueado");
  localStorage.removeItem("usuario");
  sessionStorage.clear();
  eliminarTokens();
};