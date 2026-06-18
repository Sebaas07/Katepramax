import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const AuthLoading = () => (
  <div className="auth-loading">
    <div className="auth-loading__orb" aria-hidden="true" />
    <div>
      <strong>Verificando sesión</strong>
      <span>Preparando el acceso seguro a Katepramax...</span>
    </div>
  </div>
);

/**
 * Ruta que requiere autenticación
 * Si no está logueado -> redirige a login
 */
export const RequireAuth = () => {
  const { isAuthenticated, isSessionChecked } = useAuth();

  if (!isSessionChecked) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

/**
 * Ruta que requiere un rol específico
 * @param {string|string[]} roles - Rol o roles permitidos
 */
export const RequireRole = ({ roles }) => {
  const { isAuthenticated, isSessionChecked, verificarRol } = useAuth();

  if (!isSessionChecked) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!verificarRol(roles)) {
    return <Navigate to="/acceso-denegado" replace />;
  }

  return <Outlet />;
};

/**
 * Ruta pública (solo para no autenticados)
 * Si ya está logueado -> redirige según su rol
 */
export const PublicRoute = () => {
  const { isAuthenticated, isSessionChecked, usuario } = useAuth();

  if (!isSessionChecked) {
    return <AuthLoading />;
  }

  if (isAuthenticated) {
    const redirectPath =
      usuario?.rol === "Entregador" ? "/entregas" : "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};
