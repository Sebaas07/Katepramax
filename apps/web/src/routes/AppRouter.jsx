import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth, RequireRole, PublicRoute, AuthLoading } from "./ProtectedRoutes";
import MainLayout from "@/components/layout/MainLayout";

// ── Auth ──────────────────────────────────────────────────────
import LoginPage from "@/pages/auth/LoginPage/LoginPage";

// ── Páginas comunes ───────────────────────────────────────────
import DashboardPage      from "@/pages/dashboard/DashboardPage/DashboardPage";
import AccesoDenegadoPage from "@/pages/common/AccesoDenegadoPage/AccesoDenegadoPage";
import Error404Page       from "@/pages/common/Error404Page/Error404Page";

// ── Admin + Bodega (eager — son las páginas más usadas) ───────
import InventarioPage   from "@/pages/inventario/InventarioPage/InventarioPage";
import ProductosPage    from "@/pages/productos/ProductosPage/ProductosPage";
import PedidosPage      from "@/pages/pedidos/PedidosPage/PedidosPage";
import ClientesPage     from "@/pages/clientes/ClientePage/ClientePage";
import ProveedoresPage  from "@/pages/proveedores/ProveedoresPage/ProveedoresPage";
import DistribucionPage from "@/pages/distribucion/DistribucionPage/DistribucionPage";
import ContabilidadPage from "@/pages/contabilidad/ContabilidadPage/ContabilidadPage";

// ── Lazy-loaded ───────────────────────────────────────────────
const ReportesPage  = lazy(() => import("@/pages/reportes/ReportesPage/ReportesPage"));
const UsuariosPage  = lazy(() => import("@/pages/admin/UsuariosPage/UsuariosPage"));
const AuditLogPage  = lazy(() => import("@/pages/admin/AuditLogPage/AuditLogPage"));
const EntregasPage  = lazy(() => import("@/pages/entregas/EntregasPage/EntregasPage"));

// ── Roles ─────────────────────────────────────────────────────
const ROLES = {
  ADMIN:            ["Admin"],
  BODEGA:           ["Admin", "Bodega", "AdminBogota"],
  ENTREGADOR:       ["Entregador"],
};

// ── Redirección desde raíz según rol ─────────────────────────
const RootRedirect = () => {
  const { isAuthenticated, isSessionChecked, usuario } = useAuth();
  if (!isSessionChecked) return <AuthLoading />;
  if (!isAuthenticated)  return <Navigate to="/login" replace />;
  const dest = usuario?.rol === "Entregador" ? "/entregas" : "/dashboard";
  return <Navigate to={dest} replace />;
};

// ── Router ────────────────────────────────────────────────────
const AppRouter = () => (
  <Routes>
    <Route path="/" element={<RootRedirect />} />

    {/* Pública */}
    <Route element={<PublicRoute />}>
      <Route path="/login" element={<LoginPage />} />
    </Route>

    {/* Protegidas */}
    <Route element={<RequireAuth />}>
      <Route element={<MainLayout />}>

        {/* Todos los roles autenticados */}
        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/acceso-denegado" element={<AccesoDenegadoPage />} />

        {/* Solo Entregador */}
        <Route element={<RequireRole roles={ROLES.ENTREGADOR} />}>
          <Route path="/entregas" element={
            <Suspense fallback={<AuthLoading />}><EntregasPage /></Suspense>
          } />
        </Route>

        {/* Admin + Bodega + AdminBogota */}
        <Route element={<RequireRole roles={ROLES.BODEGA} />}>
          <Route path="/pedidos"      element={<PedidosPage />} />
          <Route path="/inventario"   element={<InventarioPage />} />
          <Route path="/productos"    element={<ProductosPage />} />
          <Route path="/distribucion" element={<DistribucionPage />} />
          <Route path="/clientes"     element={<ClientesPage />} />
          <Route path="/proveedores"  element={<ProveedoresPage />} />
          <Route path="/contabilidad" element={<ContabilidadPage />} />
          <Route path="/reportes"     element={
            <Suspense fallback={<AuthLoading />}><ReportesPage /></Suspense>
          } />
        </Route>

        {/* Solo Admin */}
        <Route element={<RequireRole roles={ROLES.ADMIN} />}>
          <Route path="/admin/usuarios"  element={
            <Suspense fallback={<AuthLoading />}><UsuariosPage /></Suspense>
          } />
          <Route path="/admin/audit-log" element={
            <Suspense fallback={<AuthLoading />}><AuditLogPage /></Suspense>
          } />
        </Route>

      </Route>
    </Route>

    <Route path="*" element={<Error404Page />} />
  </Routes>
);

export default AppRouter;
