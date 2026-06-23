import { useCallback, useEffect, useState } from "react";
import {
  obtenerSesion,
  estaLogueado,
  cerrarSesion,
  guardarSesion,
} from "@/utils/sessionHelper";
import {
  iniciarSesion as loginService,
  obtenerUsuarioActual,
  cerrarSesionUsuario,
  refreshToken as refreshTokenService,
} from "@/services/auth.service";

import { AuthContext } from "@/hooks/useAuth";

const AUTH_VERIFY_TIMEOUT_MS = 2500;

const verificarUsuarioConBackend = async () => {

   if (import.meta.env.VITE_SKIP_AUTH_VERIFY === "true") {
    return { exitoso: true };
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    AUTH_VERIFY_TIMEOUT_MS,
  );

  try {
    return await obtenerUsuarioActual({ signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      console.warn("Tiempo de verificación de sesión excedido; se mantiene la sesión local.");
      return { exitoso: true };
    }

    console.warn("No se pudo validar sesión con backend:", error);
    return { exitoso: false, mensaje: error?.message || "Error al validar sesión" };
  } finally {
    window.clearTimeout(timeout);
  }
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(() => obtenerSesion());
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    estaLogueado() && Boolean(obtenerSesion()),
  );
  const [isSessionChecked, setIsSessionChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const cargarSesion = async () => {
      const sesionGuardada = obtenerSesion();
      const tieneSesionLocal = estaLogueado() && Boolean(sesionGuardada);

      if (tieneSesionLocal) {
        setUsuario(sesionGuardada);
        setIsAuthenticated(true);
      } else {
        cerrarSesion();
        setUsuario(null);
        setIsAuthenticated(false);
      }

      if (tieneSesionLocal) {
        const response = await verificarUsuarioConBackend();

        if (!mounted) return;

        if (response.exitoso && response.datos) {
          if (JSON.stringify(response.datos) !== JSON.stringify(sesionGuardada)) {
            guardarSesion(response.datos);
            setUsuario(response.datos);
          }
        } else if (response.mensaje) {
          setError(response.mensaje);
        }
      }
    };

    cargarSesion().finally(() => {
      if (mounted) {
        setIsSessionChecked(true);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (usuarioInput, contrasena) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginService(usuarioInput, contrasena);

      if (result.exitoso) {
        setUsuario(result.datos);
        setIsAuthenticated(true);
        setIsSessionChecked(true);
        return true;
      }

      setError(result.mensaje || "Error al iniciar sesión");
      return false;
    } catch (err) {
      setError(err.message || "Error de conexión");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await cerrarSesionUsuario();
    setUsuario(null);
    setIsAuthenticated(false);
    setIsSessionChecked(true);
    setError(null);
  }, []);

  const verificarRol = useCallback(
    (roles) => {
      const rolesPermitidos = Array.isArray(roles) ? roles : [roles];
      return rolesPermitidos.includes(usuario?.rol);
    },
    [usuario],
  );

  const refreshToken = useCallback(async () => {
    const result = await refreshTokenService();
    if (result.exitoso) {
      setUsuario(result.datos);
      setIsAuthenticated(true);
      return true;
    }
    setUsuario(null);
    setIsAuthenticated(false);
    return false;
  }, []);

  const value = {
    usuario,
    isAuthenticated,
    isSessionChecked,
    isLoading,
    error,
    login,
    logout,
    refreshToken,
    verificarRol,
    esAdmin: usuario?.rol === "Admin",
    esBodega: usuario?.rol === "Bodega" || usuario?.rol === "AdminBogota",
    esEntregador: usuario?.rol === "Entregador",
    esBodegaBogota:
      usuario?.rol === "AdminBogota" ||
      usuario?.esBogota === true,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
