import { clienteApi } from "./axiosConfig";

export const postLogin = (credenciales) =>
  clienteApi.post("/auth/login", credenciales);

export const getMe = () =>
  clienteApi.get("/auth/me");

export const postRefresh = (refreshToken) =>
  clienteApi.post("/auth/refresh", { refreshToken });

export const putCambiarClave = (body) =>
  clienteApi.put("/auth/cambiar-clave", body);