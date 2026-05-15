import { clienteApi } from "./axiosConfig";

/**
 * POST /auth/login
 * Envía usuario y clave, recibe el token JWT + datos del usuario.
 */
export const postLogin = (credenciales) =>
  clienteApi.post("/auth/login", credenciales);

/**
 * GET /auth/me
 * Retorna los datos del usuario autenticado usando el token actual.
 */
export const getMe = () =>
  clienteApi.get("/auth/me");

/**
 * POST /auth/refresh
 * Pide un nuevo accessToken usando el refreshToken.
 * Nota: axiosConfig.js ya llama esto automáticamente cuando hay un 401.
 */
export const postRefresh = (refreshToken) =>
  clienteApi.post("/auth/refresh", { refreshToken });

/**
 * PUT /auth/cambiar-clave
 * Cambia la contraseña del usuario logueado.
 */
export const putCambiarClave = (body) =>
  clienteApi.put("/auth/cambiar-clave", body);