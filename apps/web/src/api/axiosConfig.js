import axios from "axios";
import {
  obtenerAccessToken,
  obtenerRefreshToken,
  guardarTokens,
  cerrarSesion,
} from "@/utils/sessionHelper";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

/**
 * clienteApi — instancia principal de Axios.
 * Todos los módulos usan esta instancia. Nunca llamar axios directamente.
 */
export const clienteApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

// ── Interceptor REQUEST ───────────────────────────────────────
clienteApi.interceptors.request.use(
  (config) => {
    const token = obtenerAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Interceptor RESPONSE ──────────────────────────────────────
// Gestiona la renovación transparente del access token.
// Cola de peticiones: evita que múltiples 401 simultáneos
// disparen varios refresh en paralelo (race condition).

let estaRenovando        = false;
let peticionesEnEspera   = [];

const procesarCola = (nuevoToken) => {
  peticionesEnEspera.forEach((cb) => cb(nuevoToken));
  peticionesEnEspera = [];
};

const rechazarCola = (error) => {
  peticionesEnEspera.forEach((cb) => cb(null, error));
  peticionesEnEspera = [];
};

clienteApi.interceptors.response.use(
  (response) => response,

  async (error) => {
    const config   = error.config || {};
    const response = error.response;

    // Sin respuesta del servidor (red caída)
    if (!response) {
      if (!axios.isCancel(error)) {
        console.warn("[axiosConfig] Sin conexión al servidor:", error.message);
      }
      return Promise.reject(error);
    }

    // No reintentar el endpoint de login
    if (config?.url?.includes("/auth/login")) {
      return Promise.reject(error);
    }

    // No reintentar el propio refresh (evita bucle infinito)
    if (config?.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    // Solo actuar en 401 y solo si no reintentamos ya esta petición
    if (response.status === 401 && !config._reintentado) {
      // Si ya hay un refresh en vuelo, encolar y esperar
      if (estaRenovando) {
        return new Promise((resolve, reject) => {
          peticionesEnEspera.push((nuevoToken, err) => {
            if (err) return reject(err);
            config.headers.Authorization = `Bearer ${nuevoToken}`;
            resolve(clienteApi(config));
          });
        });
      }

      config._reintentado = true;
      estaRenovando       = true;

      try {
        const refreshToken = obtenerRefreshToken();
        if (!refreshToken) throw new Error("Sin refresh token almacenado.");

        // Instancia limpia para no pasar por este interceptor de nuevo
        const { data } = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { timeout: 8000 },
        );

        const nuevoAccess  = data.accessToken  ?? data.token;
        const nuevoRefresh = data.refreshToken ?? data.refresh_token;

        guardarTokens(nuevoAccess, nuevoRefresh);
        estaRenovando = false;
        procesarCola(nuevoAccess);

        config.headers.Authorization = `Bearer ${nuevoAccess}`;
        return clienteApi(config);
      } catch (err) {
        estaRenovando = false;
        rechazarCola(err);
        cerrarSesion();
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);
