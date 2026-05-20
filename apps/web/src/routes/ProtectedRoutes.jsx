import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

// Spinner de carga
const LoadingSpinner = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "var(--surface)",
    }}
  >
    <div className="login__spinner" style={{ width: "32px", height: "32px" }} />
  </div>
);

/**
 * Ruta que requiere autenticación
 * Si no está logueado -> redirige a login
 */
export const RequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
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
  const { isAuthenticated, isLoading, verificarRol } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
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
  const { isAuthenticated, isLoading, usuario } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    // Redirigir según el rol del usuario
    const redirectPath =
      usuario?.rol === "Entregador" ? "/entregas" : "/dashboard";
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
};
