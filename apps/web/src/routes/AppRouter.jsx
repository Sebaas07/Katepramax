import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  RequireAuth,
  RequireRole,
  PublicRoute,
  AuthLoading,
} from "./ProtectedRoutes";
import MainLayout from "@/components/layout/MainLayout";

// ── Auth ──────────────────────────────────────────────────────
import LoginPage from "@/pages/auth/LoginPage/LoginPage";

// ── Página pública de validación de factura (vía QR) ──────────
import FacturaValidacionPage from "@/pages/factura/FacturaValidacionPage/FacturaValidacionPage";

// ── Páginas comunes ───────────────────────────────────────────
import DashboardPage from "@/pages/dashboard/DashboardPage/DashboardPage";
import AccesoDenegadoPage from "@/pages/common/AccesoDenegadoPage/AccesoDenegadoPage";
import Error404Page from "@/pages/common/Error404Page/Error404Page";

// ── Páginas eager ─────────────────────────────────────────────
import InventarioPage from "@/pages/inventario/InventarioPage/InventarioPage";
import ProductosPage from "@/pages/productos/ProductosPage/ProductosPage";
import PedidosPage from "@/pages/pedidos/PedidosPage/PedidosPage";
import ClientesPage from "@/pages/clientes/ClientePage/ClientePage";
import CarteraClientesPage from "@/pages/clientes/CarteraClientesPage/CarteraClientesPage";
import ProveedoresPage from "@/pages/proveedores/ProveedoresPage/ProveedoresPage";
import DistribucionPage from "@/pages/distribucion/DistribucionPage/DistribucionPage";
import ContabilidadPage from "@/pages/contabilidad/ContabilidadPage/ContabilidadPage";

// ── Lazy-loaded ───────────────────────────────────────────────
const UsuariosPage = lazy(
  () => import("@/pages/admin/UsuariosPage/UsuariosPage"),
);
const SedesPage = lazy(() => import("@/pages/admin/SedesPage/SedesPage"));
const LogsPage = lazy(() => import("@/pages/admin/LogsPage/LogsPage"));
const EntregasPage = lazy(
  () => import("@/pages/entregas/EntregasPage/EntregasPage"),
);
const EnviosPage = lazy(() => import("@/pages/envios/EnviosPage/EnviosPage"));

// ── Roles ─────────────────────────────────────────────────────
const ROLES = {
  ADMIN: ["Admin"],
  // Pedidos + asignaciones (Oficinista gestiona)
  PEDIDOS: ["Admin", "AdminBogota", "Oficinista"],
  // Solo lectura para Bodega: inventario + reportes + entrega (distribución)
  CONSULTA: ["Admin", "AdminBogota", "Bodega", "Oficinista"],
  // Distribución/entregas: incluye a Oficinista que sigue el flujo
  ENTREGAS: ["Admin", "AdminBogota", "Oficinista", "Bodega"],
  // Módulos de gestión solo Admin/AdminBogota
  GESTION: ["Admin", "AdminBogota"],
  // Gestión de oficina: catálogo, clientes, envíos y contabilidad
  OFICINA: ["Admin", "AdminBogota", "Oficinista"],
  ENTREGADOR: ["Entregador"],
};

// ── Redirección desde raíz según rol ─────────────────────────
const RootRedirect = () => {
  const { isAuthenticated, isSessionChecked, usuario } = useAuth();
  if (!isSessionChecked) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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

    {/* Pública sin restricción de sesión: la valida el QR de la factura */}
    <Route path="/factura/:id" element={<FacturaValidacionPage />} />

    {/* Protegidas */}
    <Route element={<RequireAuth />}>
      <Route element={<MainLayout />}>
        {/* Todos los roles autenticados */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/acceso-denegado" element={<AccesoDenegadoPage />} />

        {/* Solo Entregador */}
        <Route element={<RequireRole roles={ROLES.ENTREGADOR} />}>
          <Route
            path="/entregas"
            element={
              <Suspense fallback={<AuthLoading />}>
                <EntregasPage />
              </Suspense>
            }
          />
        </Route>

        {/* Pedidos: Admin + AdminBogota + Oficinista */}
        <Route element={<RequireRole roles={ROLES.PEDIDOS} />}>
          <Route path="/pedidos" element={<PedidosPage />} />
        </Route>

        {/* Consulta sin escritura (Bodega/Oficinista lee inventario y reportes) */}
        <Route element={<RequireRole roles={ROLES.CONSULTA} />}>
          <Route path="/inventario" element={<InventarioPage />} />{" "}
        </Route>

        {/* Distribución / entregas: Admin, AdminBogota, Oficinista y Bodega */}
        <Route element={<RequireRole roles={ROLES.ENTREGAS} />}>
          <Route path="/distribucion" element={<DistribucionPage />} />
        </Route>

        {/* Módulos de gestión: Admin + AdminBogota */}
        <Route element={<RequireRole roles={ROLES.GESTION} />}>
          <Route path="/proveedores" element={<ProveedoresPage />} />
        </Route>

        {/* Gestión de oficina: catálogo, clientes, envíos y contabilidad */}
        <Route element={<RequireRole roles={ROLES.OFICINA} />}>
          <Route path="/productos" element={<ProductosPage />} />
          <Route
            path="/envios"
            element={
              <Suspense fallback={<AuthLoading />}>
                <EnviosPage />
              </Suspense>
            }
          />
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/contabilidad" element={<ContabilidadPage />} />
        </Route>

        {/* Cartera: solo Admin + AdminBogota */}
        <Route element={<RequireRole roles={ROLES.GESTION} />}>
          <Route path="/clientes/cartera" element={<CarteraClientesPage />} />
        </Route>

        {/* Solo Admin */}
        <Route element={<RequireRole roles={ROLES.ADMIN} />}>
          <Route
            path="/admin/usuarios"
            element={
              <Suspense fallback={<AuthLoading />}>
                <UsuariosPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/sedes"
            element={
              <Suspense fallback={<AuthLoading />}>
                <SedesPage />
              </Suspense>
            }
          />
          <Route
            path="/admin/logs"
            element={
              <Suspense fallback={<AuthLoading />}>
                <LogsPage />
              </Suspense>
            }
          />
        </Route>
      </Route>
    </Route>

    <Route path="*" element={<Error404Page />} />
  </Routes>
);

export default AppRouter;
