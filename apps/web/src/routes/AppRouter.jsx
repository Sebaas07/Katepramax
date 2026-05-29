import { Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth, RequireRole, PublicRoute } from "./ProtectedRoutes";

// Layout
import MainLayout from "@/components/layout/MainLayout";

// Páginas — Auth
import LoginPage from "@/pages/auth/LoginPage/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage/DashboardPage";
import InventarioPage from "@/pages/inventario/InventarioPage/InventarioPage";
import PedidosPage from "@/pages/pedidos/PedidosPage/PedidosPage";
import EntregasPage from "@/pages/entregas/EntregasPage/EntregasPage";
import ClientesPage from "@/pages/clientes/ClientePage/ClientePage";
import Error404Page from "@/pages/common/Error404Page/Error404Page";
import AccesoDenegadoPage from "@/pages/common/AccesoDenegadoPage/AccesoDenegadoPage";
import { useAuth } from "@/hooks/useAuth";
import ProveedoresPage from "../pages/proveedores/ProveedoresPage/ProveedoresPage";



// Páginas — Solo Admin (placeholders hasta Sprint 4-5)
// Se importan en diferido para no bloquear el bundle
import { lazy, Suspense } from "react";

const ContabilidadPage = lazy(() =>
  import("@/pages/contabilidad/ContabilidadPage/ContabilidadPage").catch(() => ({
    default: () => <PlaceholderPage titulo="Contabilidad" icono="account_balance" sprint={4} />,
  }))
);

const ReportesPage = lazy(() =>
  import("@/pages/reportes/ReportesPage/ReportesPage").catch(() => ({
    default: () => <PlaceholderPage titulo="Reportes" icono="assessment" sprint={5} />,
  }))
);

const UsuariosPage = lazy(() =>
  import("@/pages/admin/UsuariosPage/UsuariosPage").catch(() => ({
    default: () => <PlaceholderPage titulo="Usuarios" icono="group" sprint={5} />,
  }))
);

const AuditLogPage = lazy(() =>
  import("@/pages/admin/AuditLogPage/AuditLogPage").catch(() => ({
    default: () => <PlaceholderPage titulo="Audit Log" icono="history_edu" sprint={5} />,
  }))
);

// ─── Página placeholder genérica para módulos en desarrollo ──
const PlaceholderPage = ({ titulo, icono, sprint }) => (
  <div style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: "1rem",
    color: "var(--on-surface-variant)",
    fontFamily: "var(--font-label)",
    textAlign: "center",
    padding: "2rem",
  }}>
    <span className="material-symbols-outlined" style={{ fontSize: 56, opacity: 0.3 }}>
      {icono ?? "construction"}
    </span>
    <h2 style={{
      fontFamily: "var(--font-headline)",
      fontSize: "1.25rem",
      color: "var(--on-surface)",
      margin: 0,
    }}>
      {titulo}
    </h2>
    <p style={{ margin: 0, fontSize: 13 }}>
      Este módulo estará disponible en el Sprint {sprint ?? "próximo"}.
    </p>
  </div>
);

// ─── Suspense fallback ────────────────────────────────────────
const Cargando = () => (
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    color: "var(--on-surface-variant)",
    fontFamily: "var(--font-label)",
    fontSize: 13,
    gap: "0.75rem",
  }}>
    <div style={{
      width: 28,
      height: 28,
      border: "3px solid var(--outline-variant)",
      borderTopColor: "var(--secondary)",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    }} />
    Cargando módulo...
  </div>
);

// ─── Roles por módulo ─────────────────────────────────────────
const ROLES = {
  ADMIN:      ["Admin"],
  BODEGA:     ["Admin", "Bodega"],
  ENTREGADOR: ["Entregador"],
  ALL:        ["Admin", "Bodega", "Entregador"],
};

// ─── Redirección inteligente desde la raíz ────────────────────
const RootRedirect = () => {
  const { isAuthenticated, usuario, isLoading } = useAuth();

  if (isLoading) return <Cargando />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Entregador va directo a sus entregas
  if (usuario?.rol === "Entregador") return <Navigate to="/entregas" replace />;

  return <Navigate to="/dashboard" replace />;
};

// ─── Router principal ─────────────────────────────────────────
const AppRouter = () => {
  return (
    <Routes>
      {/* Raíz — redirige según autenticación y rol */}
      <Route path="/" element={<RootRedirect />} />

      {/* Rutas públicas */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Rutas protegidas — requieren sesión activa */}
      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>

          {/* ── Todos los roles autenticados ── */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/acceso-denegado" element={<AccesoDenegadoPage />} />

          {/* ── Solo Entregador ── */}
          <Route element={<RequireRole roles={ROLES.ENTREGADOR} />}>
            <Route path="/entregas" element={<EntregasPage />} />
          </Route>

          {/* Admin + Bodega (incluye AdminBogota) */}
          <Route element={<RequireRole roles={ROLES.BODEGA} />}>
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
          </Route>

            {/* Placeholders Sprint 4-5 — lazy loaded */}
            <Route
              path="/contabilidad"
              element={
                <Suspense fallback={<Cargando />}>
                  <ContabilidadPage />
                </Suspense>
              }
            />
            <Route
              path="/reportes"
              element={
                <Suspense fallback={<Cargando />}>
                  <ReportesPage />
                </Suspense>
              }
            />
          </Route>

          {/* Admin + AdminBogota (bodega central) */}
          <Route element={<RequireRole roles={ROLES.ADMIN} />}>
            <Route
              path="/distribucion"
              element={
                <PlaceholderPage
                  titulo="Distribución"
                  icono="sync_alt"
                  sprint={3}
                />
              }
            />
            <Route
              path="/productos"
              element={
                <PlaceholderPage
                  titulo="Productos"
                  icono="category"
                  sprint={3}
                />
              }
            />
          </Route>

          {/* ── Solo Admin ── */}
          <Route element={<RequireRole roles={ROLES.ADMIN} />}>
            <Route
              path="/admin/usuarios"
              element={
                <Suspense fallback={<Cargando />}>
                  <UsuariosPage />
                </Suspense>
              }
            />
            <Route
              path="/admin/audit-log"
              element={
                <Suspense fallback={<Cargando />}>
                  <AuditLogPage />
                </Suspense>
              }
            />
            <Route path="/productos" element={<div>Productos Page</div>} />
            <Route path="/proveedores" element={<ProveedoresPage />} />
            <Route path="/reportes" element={<div>Reportes Page</div>} />
          </Route>

        </Route>

      {/* 404 — fuera del layout */}
      <Route path="*" element={<Error404Page />} />
    </Routes>
  );
};

export default AppRouter;
