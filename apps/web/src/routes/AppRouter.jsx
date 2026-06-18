import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth, RequireRole, PublicRoute, AuthLoading } from "./ProtectedRoutes";

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

// ─── Redirección inteligente desde raíz ───────────────────────
const RootRedirect = () => {
  const { isAuthenticated, isSessionChecked, usuario } = useAuth();
  if (!isSessionChecked) return <AuthLoading />;
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

        {/* Todos los roles */}
        <Route path="/dashboard"       element={<DashboardPage />} />
        <Route path="/acceso-denegado" element={<AccesoDenegadoPage />} />

        {/* Solo Entregador */}
        <Route element={<RequireRole roles={ROLES.ENTREGADOR} />}>
          <Route path="/entregas" element={<EntregasPage />} />
        </Route>

        {/* Admin + Bodega */}
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

        {/* Solo Admin */}
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
