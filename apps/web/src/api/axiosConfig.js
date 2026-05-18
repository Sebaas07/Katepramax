import axios from "axios";
import {
  obtenerAccessToken,
  obtenerRefreshToken,
  guardarTokens,
  cerrarSesion,
} from "@/utils/sessionHelper";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Instancia principal de Axios.
 * Todos los módulos de la app deben usar esta instancia para hacer peticiones al backend.
 * Nunca usar axios directamente fuera de este archivo.
 */
export const clienteApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Interceptor de REQUEST ───────────────────────────────────────────────────
// Se ejecuta ANTES de cada petición.
// Lee el token de la cookie y lo adjunta al header Authorization.
clienteApi.interceptors.request.use(
  (config) => {
    const token = obtenerAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Interceptor de RESPONSE ──────────────────────────────────────────────────
// Se ejecuta DESPUÉS de cada respuesta del servidor.
// Si llega un 401 (token expirado), renueva el token de forma transparente.

// Estas dos variables evitan que si llegan 3 peticiones al mismo tiempo
// y todas fallan con 401, las 3 intenten renovar el token a la vez.
// Solo la primera lo renueva, las otras dos esperan en la cola.
let estaRenovando = false;
let peticionesEnEspera = [];

const procesarCola = (nuevoToken) => {
  peticionesEnEspera.forEach((cb) => cb(nuevoToken));
  peticionesEnEspera = [];
};

clienteApi.interceptors.response.use(
  (response) => response,

  async (error) => {
    const config = error.config || {};
    const response = error.response;

    // Sin respuesta = servidor caído o sin internet
    if (!response) {
      console.warn("Sin conexión al servidor:", error.message);
      return Promise.reject(error);
    }

    // El endpoint de login no debe intentar renovar token
    if (config?.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }

    // Solo actuar en 401 y solo si no reintentamos esta petición antes
    if (response.status === 401 && !config._reintentado) {

      // Si ya hay una renovación en curso, encolar y esperar
      if (estaRenovando) {
        return new Promise((resolve) => {
          peticionesEnEspera.push((nuevoToken) => {
            config.headers.Authorization = `Bearer ${nuevoToken}`;
            resolve(clienteApi(config));
          });
        });
      }

      config._reintentado = true;
      estaRenovando = true;

      try {
        const refreshToken = obtenerRefreshToken();
        if (!refreshToken) throw new Error("Sin refresh token");

        // Instancia LIMPIA para no pasar por este mismo interceptor
        // y evitar un bucle infinito
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        guardarTokens(data.accessToken, data.refreshToken);
        estaRenovando = false;
        procesarCola(data.accessToken);

        config.headers.Authorization = `Bearer ${data.accessToken}`;
        return clienteApi(config);

      } catch (err) {
        estaRenovando = false;
        peticionesEnEspera = [];
        cerrarSesion();
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);