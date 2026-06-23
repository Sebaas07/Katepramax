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
const normalizarUsuario = (usuario) => {
  if (!usuario) return null;

  return {
    ...usuario,
    // Asegurar que sede sea string
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

  const usuarioNormalizado = {
    ...usuario,
    sede: sedeNormalizada,
  };

  localStorage.setItem("logueado", "true");
  localStorage.setItem("usuario", JSON.stringify(usuarioNormalizado));
};

export const obtenerSesion = () => {
  const usuario = localStorage.getItem("usuario");
  if (!usuario) return null;
  try {
    const parsed = JSON.parse(usuario);
    return normalizarUsuario(parsed);
  } catch {
    return null;
  }
};

export const estaLogueado = () =>
  localStorage.getItem("logueado") === "true" && !!obtenerAccessToken();

export const actualizarSesion = (datosNuevos) => {
  const actual = obtenerSesion();
  if (actual) {
    localStorage.setItem(
      "usuario",
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
 * Condición: rol === "AdminBogota" o (rol === "Admin" y sede === "Bogotá")
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
  localStorage.removeItem("logueado");
  localStorage.removeItem("usuario");
  sessionStorage.clear();
  eliminarTokens();
};
