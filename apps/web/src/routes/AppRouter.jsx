import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth, RequireRole, PublicRoute } from "./ProtectedRoutes";

// Layout
import MainLayout from "@/components/layout/MainLayout";

// Auth
import LoginPage from "@/pages/auth/LoginPage/LoginPage";

// Comunes
import DashboardPage      from "@/pages/dashboard/DashboardPage/DashboardPage";
import Error404Page       from "@/pages/common/Error404Page/Error404Page";
import AccesoDenegadoPage from "@/pages/common/AccesoDenegadoPage/AccesoDenegadoPage";

// Admin + Bodega
import InventarioPage   from "@/pages/inventario/InventarioPage/InventarioPage";
import ProductosPage    from "@/pages/productos/ProductosPage/ProductosPage";
import PedidosPage      from "@/pages/pedidos/PedidosPage/PedidosPage";
import ClientesPage     from "@/pages/clientes/ClientePage/ClientePage";
import ProveedoresPage  from "@/pages/proveedores/ProveedoresPage/ProveedoresPage";
import DistribucionPage from "@/pages/distribucion/DistribucionPage/DistribucionPage";
import ContabilidadPage from "@/pages/contabilidad/ContabilidadPage/ContabilidadPage";
import ReportesPage     from "@/pages/reportes/ReportesPage/ReportesPage";

// Solo Admin
import UsuariosPage from "@/pages/admin/UsuariosPage/UsuariosPage";
import AuditLogPage from "@/pages/admin/AuditLogPage/AuditLogPage";

// Entregador
import EntregasPage from "@/pages/entregas/EntregasPage/EntregasPage";

// ─── Roles ────────────────────────────────────────────────────
const ROLES = {
  ADMIN:      ["Admin"],
  BODEGA:     ["Admin", "AdminBogota", "Bodega"],
  ENTREGADOR: ["Entregador"],
};

// ─── Spinner ──────────────────────────────────────────────────
const Cargando = () => (
  <div style={{
    display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "60vh", color: "var(--on-surface-variant)",
    fontFamily: "var(--font-label)", fontSize: 13, gap: "0.75rem",
  }}>
    <div style={{
      width: 28, height: 28,
      border: "3px solid var(--outline-variant)",
      borderTopColor: "var(--aged-gold)",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
    Cargando...
  </div>
);

// ─── Redirección inteligente desde raíz ──────────────────────
const RootRedirect = () => {
  const { isAuthenticated, usuario, isLoading } = useAuth();
  if (isLoading)        return <Cargando />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (usuario?.rol === "Entregador") return <Navigate to="/entregas" replace />;
  return <Navigate to="/dashboard" replace />;
};

// ─── Router ───────────────────────────────────────────────────
const AppRouter = () => (
  <Routes>
    <Route path="/" element={<RootRedirect />} />

    <Route element={<PublicRoute />}>
      <Route path="/login" element={<LoginPage />} />
    </Route>

    <Route element={<RequireAuth />}>
      <Route element={<MainLayout />}>

        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/acceso-denegado" element={<AccesoDenegadoPage />} />

        <Route element={<RequireRole roles={ROLES.ENTREGADOR} />}>
          <Route path="/entregas" element={<EntregasPage />} />
        </Route>

        <Route element={<RequireRole roles={ROLES.BODEGA} />}>
          <Route path="/pedidos"      element={<PedidosPage />} />
          <Route path="/inventario"   element={<InventarioPage />} />
          <Route path="/productos"    element={<ProductosPage />} />
          <Route path="/distribucion" element={<DistribucionPage />} />
          <Route path="/clientes"     element={<ClientesPage />} />
          <Route path="/proveedores"  element={<ProveedoresPage />} />
          <Route path="/contabilidad" element={<ContabilidadPage />} />
          <Route path="/reportes"     element={<ReportesPage />} />
        </Route>

        <Route element={<RequireRole roles={ROLES.ADMIN} />}>
          <Route path="/admin/usuarios"  element={<UsuariosPage />} />
          <Route path="/admin/audit-log" element={<AuditLogPage />} />
        </Route>

      </Route>
    </Route>

    <Route path="*" element={<Error404Page />} />
  </Routes>
);

export default AppRouter;
