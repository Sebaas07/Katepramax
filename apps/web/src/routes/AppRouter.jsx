import { Routes, Route, Navigate } from "react-router-dom";
import { RequireAuth, RequireRole, PublicRoute } from "./ProtectedRoutes";

// Layout
import MainLayout from "@/components/layout/MainLayout";

// Páginas
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

// Definición de roles por módulo
const ROLES = {
  ADMIN: ["Admin"],
  ADMIN_BOGOTA: ["Admin"], // Admin Bogotá es solo Admin con sede Bogotá
  BODEGA: ["Admin", "Bodega"], // Admin (cualquier sede) + Bodega
  ENTREGADOR: ["Entregador"],
  ALL: ["Admin", "Bodega", "Entregador"],
};

// Componente para redirigir desde la raíz
const RootRedirect = () => {
  const { isAuthenticated, usuario, isLoading } = useAuth();

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirigir según el rol
  if (usuario?.rol === "Entregador") {
    return <Navigate to="/entregas" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

const AppRouter = () => {
  return (
    <Routes>
      {/* Ruta raíz - redirige según autenticación */}
      <Route path="/" element={<RootRedirect />} />

      {/* Rutas Públicas */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Rutas Protegidas (requieren autenticación) */}
      <Route element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          {/* Todos los autenticados */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Solo Entregador */}
          <Route element={<RequireRole roles={ROLES.ENTREGADOR} />}>
            <Route path="/entregas" element={<EntregasPage />} />
          </Route>

          {/* Admin + Bodega (incluye AdminBogota) */}
          <Route element={<RequireRole roles={ROLES.BODEGA} />}>
            <Route path="/pedidos" element={<PedidosPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
          </Route>

          {/* Solo Admin (global) */}
          <Route element={<RequireRole roles={ROLES.ADMIN} />}>
            <Route path="/admin/usuarios" element={<div>Usuarios Page</div>} />
            <Route
              path="/contabilidad"
              element={<div>Contabilidad Page</div>}
            />
          </Route>

          {/* Admin + AdminBogota (bodega central) */}
          <Route element={<RequireRole roles={ROLES.ADMIN} />}>
            <Route
              path="/distribucion"
              element={<div>Distribución Page</div>}
            />
            <Route path="/productos" element={<div>Productos Page</div>} />
            <Route path="/proveedores" element={<ProveedoresPage />} />
            <Route path="/reportes" element={<div>Reportes Page</div>} />
          </Route>

          {/* Acceso denegado */}
          <Route path="/acceso-denegado" element={<AccesoDenegadoPage />} />
        </Route>
      </Route>

      {/* 404 - fuera del layout */}
      <Route path="*" element={<Error404Page />} />
    </Routes>
  );
};

export default AppRouter;
