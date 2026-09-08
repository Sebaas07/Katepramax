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
import CarteraProveedoresPage from "@/pages/proveedores/CarteraProveedoresPage/CarteraProveedoresPage";
import HistorialProveedorPage from "@/pages/proveedores/HistorialProveedorPage/HistorialProveedorPage";
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
const AbonosEntregadorPage = lazy(
  () => import("@/pages/abonos/AbonosEntregadorPage/AbonosEntregadorPage"),
);

// ── Roles ─────────────────────────────────────────────────────
const ROLES = {
  ADMIN: ["Admin", "AdminBogota"],
  PEDIDOS: ["Admin", "AdminBogota", "Oficinista"],
  CONSULTA: ["Admin", "AdminBogota", "Bodega", "Oficinista"],
  CARTERA_PROVEEDORES: ["Admin", "AdminBogota", "Oficinista"],
  CATALOGO: ["Admin", "AdminBogota", "Bodega", "Oficinista"],
  ENTREGAS: ["Admin", "AdminBogota", "Bodega"],
  ENVIOS: ["Admin", "AdminBogota", "Bodega"],
  GESTION: ["Admin", "AdminBogota"],
  CLIENTES: ["Admin", "AdminBogota", "Bodega", "Oficinista"],
  CONTABILIDAD: ["Admin", "AdminBogota", "Oficinista"],
  ENTREGADOR: ["Entregador"],
};

const RootRedirect = () => {
  const { isAuthenticated, isSessionChecked, usuario } = useAuth();
  if (!isSessionChecked) return <AuthLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const dest = usuario?.rol === "Entregador" ? "/entregas" : "/dashboard";
  return <Navigate to={dest} replace />;
};

const AppRouter = () => (
  <Routes>
    <Route path="/" element={<RootRedirect />} />

    <Route element={<PublicRoute />}>
      <Route path="/login" element={<LoginPage />} />
    </Route>

    <Route path="/factura/:token" element={<FacturaValidacionPage />} />

    <Route element={<RequireAuth />}>
      <Route element={<MainLayout />}>
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
          <Route
            path="/abonos"
            element={
              <Suspense fallback={<AuthLoading />}>
                <AbonosEntregadorPage />
              </Suspense>
            }
          />
        </Route>

        <Route element={<RequireRole roles={ROLES.PEDIDOS} />}>
          <Route path="/pedidos" element={<PedidosPage />} />
        </Route>

        <Route element={<RequireRole roles={ROLES.CONSULTA} />}>
          <Route path="/inventario" element={<InventarioPage />} />{" "}
          <Route path="/proveedores" element={<ProveedoresPage />} />
        </Route>

        <Route element={<RequireRole roles={ROLES.CARTERA_PROVEEDORES} />}>
          <Route path="/proveedores/cartera" element={<CarteraProveedoresPage />} />
          <Route
            path="/proveedores/cartera/historial/:proveedorId"
            element={<HistorialProveedorPage />}
          />
        </Route>

        <Route element={<RequireRole roles={ROLES.ENTREGAS} />}>
          <Route path="/distribucion" element={<DistribucionPage />} />
        </Route>

        <Route element={<RequireRole roles={ROLES.CATALOGO} />}>
          <Route path="/productos" element={<ProductosPage />} />
        </Route>

        <Route element={<RequireRole roles={ROLES.ENVIOS} />}>
          <Route
            path="/envios"
            element={
              <Suspense fallback={<AuthLoading />}>
                <EnviosPage />
              </Suspense>
            }
          />
        </Route>

        <Route element={<RequireRole roles={ROLES.CLIENTES} />}>
          <Route path="/clientes" element={<ClientesPage />} />
        </Route>

        <Route element={<RequireRole roles={ROLES.CONTABILIDAD} />}>
          <Route path="/contabilidad" element={<ContabilidadPage />} />
        </Route>

        <Route element={<RequireRole roles={ROLES.GESTION} />}>
          <Route path="/clientes/cartera" element={<CarteraClientesPage />} />
        </Route>

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
