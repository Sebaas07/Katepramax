import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// ── Pantalla de carga de sesión ───────────────────────────────
export const AuthLoading = () => (
  <div className="auth-loading" role="status" aria-label="Verificando sesión">
    <div className="auth-loading__orb" aria-hidden="true" />
    <div>
      <strong>Verificando sesión</strong>
      <span>Preparando el acceso seguro a Katepramax...</span>
    </div>
  </div>
);

/**
 * RequireAuth — Requiere usuario autenticado.
 * Si no está logueado → /login
 */
export const RequireAuth = () => {
  const { isAuthenticated, isSessionChecked } = useAuth();
  if (!isSessionChecked) return <AuthLoading />;
  if (!isAuthenticated)  return <Navigate to="/login" replace />;
  return <Outlet />;
};

/**
 * RequireRole — Requiere uno de los roles indicados.
 * Si no está logueado → /login
 * Si no tiene el rol  → /acceso-denegado
 *
 * @param {{ roles: string | string[] }} props
 */
export const RequireRole = ({ roles }) => {
  const { isAuthenticated, isSessionChecked, verificarRol } = useAuth();
  if (!isSessionChecked) return <AuthLoading />;
  if (!isAuthenticated)  return <Navigate to="/login"           replace />;
  if (!verificarRol(roles)) return <Navigate to="/acceso-denegado" replace />;
  return <Outlet />;
};

/**
 * PublicRoute — Solo para usuarios NO autenticados.
 * Si ya está logueado → redirige según su rol.
 */
export const PublicRoute = () => {
  const { isAuthenticated, isSessionChecked, usuario } = useAuth();
  if (!isSessionChecked) return <AuthLoading />;
  if (isAuthenticated) {
    const dest = usuario?.rol === "Entregador" ? "/entregas" : "/dashboard";
    return <Navigate to={dest} replace />;
  }
  return <Outlet />;
};
