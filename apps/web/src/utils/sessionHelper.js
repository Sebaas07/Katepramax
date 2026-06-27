import Cookies from "js-cookie";

const COOKIE_OPTIONS = {
  expires: 7,
  sameSite: "Strict",
};

// ─── Keys versionadas — cambiar la versión invalida datos guardados con shape antiguo
const KEY_USUARIO = "usuario:v1";
const KEY_LOGUEADO = "logueado:v1";

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
const normalizarUsuario = (usuario) => {
  if (!usuario) return null;
  return {
    ...usuario,
    sede:
      typeof usuario.sede === "object" && usuario.sede !== null
        ? usuario.sede.nombre || usuario.sede.name || "Bogotá"
        : usuario.sede || "Bogotá",
    nombreCompleto: usuario.nombreCompleto || usuario.nombre || "Usuario",
  };
};

export const guardarSesion = (usuario) => {
  const sedeNormalizada = usuario?.sede
    ? typeof usuario.sede === "object"
      ? usuario.sede.nombre || usuario.sede.name || "Bogotá"
      : usuario.sede
    : "Bogotá";

  const usuarioNormalizado = { ...usuario, sede: sedeNormalizada };

  localStorage.setItem(KEY_LOGUEADO, "true");
  localStorage.setItem(KEY_USUARIO, JSON.stringify(usuarioNormalizado));
};

export const obtenerSesion = () => {
  const raw = localStorage.getItem(KEY_USUARIO);
  if (!raw) return null;
  try {
    return normalizarUsuario(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const estaLogueado = () =>
  localStorage.getItem(KEY_LOGUEADO) === "true" && !!obtenerAccessToken();

export const actualizarSesion = (datosNuevos) => {
  const actual = obtenerSesion();
  if (actual) {
    localStorage.setItem(
      KEY_USUARIO,
      JSON.stringify({ ...actual, ...datosNuevos }),
    );
  }
};

export const obtenerRol = () => {
  const sesion = obtenerSesion();
  return sesion ? sesion.rol : null;
};

export const tieneRol = (...roles) => {
  const rol = obtenerRol();
  return roles.includes(rol);
};

/**
 * Verifica si el usuario es Bodega de la sede Bogotá (Admin Bogotá).
 */
export const esBodegaBogota = () => {
  const sesion = obtenerSesion();
  if (!sesion) return false;
  return (
    sesion.rol === "AdminBogota" ||
    (sesion.rol === "Admin" && sesion.sede === "Bogotá")
  );
};

/**
 * Cierra la sesión completamente.
 */
export const cerrarSesion = () => {
  localStorage.removeItem(KEY_LOGUEADO);
  localStorage.removeItem(KEY_USUARIO);
  sessionStorage.clear();
  eliminarTokens();
};
