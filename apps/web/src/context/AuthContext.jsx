import { useState, useEffect, useCallback } from "react";
import {
  obtenerSesion,
  estaLogueado,
  cerrarSesion,
  guardarSesion,
  tieneRol,
} from "@/utils/sessionHelper";
import {
  iniciarSesion as loginService,
  obtenerUsuarioActual,
  cerrarSesionUsuario,
} from "@/services/auth.service";

import { AuthContext } from "@/hooks/useAuth";

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cargar sesión al iniciar
  useEffect(() => {
    const cargarSesion = async () => {
      try {
        const logueado = estaLogueado();
        const sesionGuardada = obtenerSesion();

        if (logueado && sesionGuardada) {
          setUsuario(sesionGuardada);
          setIsAuthenticated(true);

          try {
            const response = await obtenerUsuarioActual();
            if (response.exitoso) {
              if (
                JSON.stringify(response.datos) !==
                JSON.stringify(sesionGuardada)
              ) {
                guardarSesion(response.datos);
                setUsuario(response.datos);
              }
            }
          } catch (err) {
            console.warn("No se pudo validar sesión con backend:", err);
          }
        }
      } catch (err) {
        console.error("Error cargando sesión:", err);
        cerrarSesion();
      } finally {
        setIsLoading(false);
      }
    };

    cargarSesion();
  }, []);

  const login = useCallback(async (usuario, contrasena) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginService(usuario, contrasena);

      if (result.exitoso) {
        setUsuario(result.datos);
        setIsAuthenticated(true);
        return true;
      } else {
        setError(result.mensaje || "Error al iniciar sesión");
        return false;
      }
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
    setError(null);
  }, []);

  const verificarRol = useCallback(
    (roles) => {
      if (!isAuthenticated) return false;
      return tieneRol(...(Array.isArray(roles) ? roles : [roles]));
    },
    [isAuthenticated],
  );

  const value = {
    usuario,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    verificarRol,
    esAdmin: usuario?.rol === "Admin",
    esBodega: usuario?.rol === "Bodega",
    esEntregador: usuario?.rol === "Entregador",
    esBodegaBogota: usuario?.rol === "Admin" && usuario?.sede === "Bogotá",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
