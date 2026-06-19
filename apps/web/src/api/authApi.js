import { clienteApi } from "./axiosConfig";

export const postLogin = (credenciales) =>
  clienteApi.post("/auth/login", credenciales);

export const getMe = (options = {}) =>
  clienteApi.get("/auth/me", { signal: options.signal });

export const postRefresh = (refreshToken) =>
  clienteApi.post("/auth/refresh", { refreshToken });

export const putCambiarClave = (body) =>
  clienteApi.patch("/auth/clave", body);

export const postLogout = () =>
  clienteApi.post("/auth/logout");