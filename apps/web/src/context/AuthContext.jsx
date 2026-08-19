import { useCallback, useEffect, useRef, useState } from "react";
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
} from "@/services/auth.service";
import { AuthContext } from "@/hooks/useAuth";

const AUTH_VERIFY_TIMEOUT_MS = 3000;

/**
 * Verifica la sesión con el backend.
 * Si el servidor tarda más de AUTH_VERIFY_TIMEOUT_MS, conserva la sesión local.
 * Si responde con error de autenticación (401/403), cierra sesión.
 */
const verificarConBackend = async (signal) => {
  try {
    const result = await obtenerUsuarioActual({ signal });
    return result;
  } catch (error) {
    if (error?.name === "AbortError" || error?.name === "CanceledError") {
      // Timeout — conservar sesión local silenciosamente
      return { exitoso: true, datos: null };
    }
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      return { exitoso: false, forzarCierre: true };
    }
    // Error de red u otro — conservar sesión local
    console.warn("[AuthContext] No se pudo verificar sesión con backend:", error?.message);
    return { exitoso: true, datos: null };
  }
};

export const AuthProvider = ({ children }) => {
  const [usuario,           setUsuario]          = useState(() => obtenerSesion());
  const [isAuthenticated,   setIsAuthenticated]  = useState(() => estaLogueado() && Boolean(obtenerSesion()));
  const [isSessionChecked,  setIsSessionChecked] = useState(false);
  const [isLoading,         setIsLoading]        = useState(true);
  const [error,             setError]            = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const cargarSesion = async () => {
      const sesionLocal     = obtenerSesion();
      const tieneSesionLocal = estaLogueado() && Boolean(sesionLocal);

      if (!tieneSesionLocal) {
        cerrarSesion();
        if (mountedRef.current) {
          setUsuario(null);
          setIsAuthenticated(false);
        }
        return;
      }

      // Sesión local presente → mostrar UI inmediatamente
      if (mountedRef.current) {
        setUsuario(sesionLocal);
        setIsAuthenticated(true);
      }

      // Verificar con el backend en segundo plano
      const controller = new AbortController();
      const timeoutId  = window.setTimeout(() => controller.abort(), AUTH_VERIFY_TIMEOUT_MS);

      const result = await verificarConBackend(controller.signal);
      window.clearTimeout(timeoutId);

      if (!mountedRef.current) return;

      if (result.forzarCierre) {
        cerrarSesion();
        setUsuario(null);
        setIsAuthenticated(false);
        return;
      }

      // Si el backend devolvió datos actualizados, sincronizar
      if (result.exitoso && result.datos) {
        const datosNormalizados = result.datos;
        if (JSON.stringify(datosNormalizados) !== JSON.stringify(sesionLocal)) {
          guardarSesion(datosNormalizados);
          setUsuario(datosNormalizados);
        }
      }
    };

    cargarSesion().finally(() => {
      if (mountedRef.current) {
        setIsSessionChecked(true);
        setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
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
    try {
      await cerrarSesionUsuario();
    } catch {
      // El servidor puede haber revocado la sesión ya — continuar igualmente
    } finally {
      cerrarSesion();
      setUsuario(null);
      setIsAuthenticated(false);
      setIsSessionChecked(true);
      setError(null);
    }
  }, []);

  const verificarRol = useCallback(
    (roles) => {
      const permitidos = Array.isArray(roles) ? roles : [roles];
      return permitidos.includes(usuario?.rol);
    },
    [usuario],
  );

  const value = {
    usuario,
    isAuthenticated,
    isSessionChecked,
    isLoading,
    error,
    login,
    logout,
    verificarRol,

    // Booleanos derivados del rol — única fuente de verdad en el frontend
    esAdmin:        usuario?.rol === "Admin",
    esBodega:       usuario?.rol === "Bodega" || usuario?.rol === "AdminBogota",
    esEntregador:   usuario?.rol === "Entregador",
    esAdminBogota:  usuario?.rol === "AdminBogota",
    esOficinista:   usuario?.rol === "Oficinista",
    esBodegaBogota: usuario?.rol === "AdminBogota",

    // Tabajos de gestión con escritura (pedidos/asignaciones) → Admin, AdminBogota, Oficinista
    puedeGestionarPedidos: ["Admin", "AdminBogota", "Oficinista"].includes(usuario?.rol),

    // Asignar entregador a pedidos → Admin, AdminBogota, Bodega (Oficinista NO)
    puedeAsignarEntregador: ["Admin", "AdminBogota", "Bodega"].includes(usuario?.rol),

    // Escritura en módulos de gestión (inventario, contabilidad, etc.) → Admin, AdminBogota
    esAdminGestion: usuario?.rol === "Admin" || usuario?.rol === "AdminBogota",

    // Puede ver y editar datos de gestión (inventario, productos, pedidos, etc.)
    puedeGestionar: ["Admin", "AdminBogota", "Bodega", "Oficinista"].includes(usuario?.rol),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
