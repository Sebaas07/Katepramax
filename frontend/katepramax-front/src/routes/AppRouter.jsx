import { Routes, Route, Navigate } from "react-router-dom";
import { estaLogueado, tieneRol } from "@/utils/sessionHelper";

// Layout
import MainLayout from "@/components/layout/MainLayout";

// Páginas — por ahora solo existen Login y Dashboard,
// las demás las iremos creando en los próximos sprints.
// Las importamos comentadas para no generar errores.
import LoginPage from "@/pages/auth/LoginPage/LoginPage";
import DashboardPage from "@/pages/dashboard/DashboardPage/DashboardPage";
import Error404Page from "@/pages/common/Error404Page/Error404Page";
import AccesoDenegadoPage from "@/pages/common/AccesoDenegadoPage/AccesoDenegadoPage";

// Próximamente (descomentar cuando se creen):
// import PedidosPage from "@/pages/pedidos/PedidosPage/PedidosPage";
// import EntregasPage from "@/pages/entregas/EntregasPage/EntregasPage";
// import InventarioPage from "@/pages/inventario/InventarioPage/InventarioPage";
// import ProductosPage from "@/pages/productos/ProductosPage/ProductosPage";
// import ProveedoresPage from "@/pages/proveedores/ProveedoresPage/ProveedoresPage";
// import ContabilidadPage from "@/pages/contabilidad/ContabilidadPage/ContabilidadPage";
// import ReportesPage from "@/pages/reportes/ReportesPage/ReportesPage";
// import UsuariosPage from "@/pages/admin/UsuariosPage/UsuariosPage";
// import DistribucionPage from "@/pages/distribucion/DistribucionPage/DistribucionPage";

// ─── Guardas ──────────────────────────────────────────────────────────────────

const RutaPublica = ({ children }) => {
  if (estaLogueado()) return <Navigate to="/dashboard" replace />;
  return children;
};

const RutaProtegida = ({ children }) => {
  if (!estaLogueado()) return <Navigate to="/login" replace />;
  return children;
};

// eslint-disable-next-line no-unused-vars
const RutaPorRol = ({ roles, children }) => {
  if (!estaLogueado()) return <Navigate to="/login" replace />;
  if (!tieneRol(...roles)) return <Navigate to="/acceso-denegado" replace />;
  return children;
};

// ─── Router ───────────────────────────────────────────────────────────────────

const AppRouter = () => {
  return (
    <Routes>
      {/* Raíz: redirige según sesión */}
      <Route
        path="/"
        element={
          estaLogueado()
            ? <Navigate to="/dashboard" replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* Ruta pública */}
      <Route
        path="/login"
        element={
          <RutaPublica>
            <LoginPage />
          </RutaPublica>
        }
      />

      {/* Rutas protegidas — dentro del layout con sidebar */}
      <Route
        element={
          <RutaProtegida>
            <MainLayout />
          </RutaProtegida>
        }
      >
        {/* Todos los roles logueados */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Entregas — todos los roles, la página filtra internamente */}
        {/* <Route path="/entregas" element={<EntregasPage />} /> */}

        {/* Solo Admin y Bodega */}
        {/* <Route path="/pedidos" element={
          <RutaPorRol roles={["Admin", "Bodega"]}>
            <PedidosPage />
          </RutaPorRol>
        } /> */}

        {/* <Route path="/inventario" element={
          <RutaPorRol roles={["Admin", "Bodega"]}>
            <InventarioPage />
          </RutaPorRol>
        } /> */}

        {/* <Route path="/productos" element={
          <RutaPorRol roles={["Admin", "Bodega"]}>
            <ProductosPage />
          </RutaPorRol>
        } /> */}

        {/* <Route path="/distribucion" element={
          <RutaPorRol roles={["Admin", "Bodega"]}>
            <DistribucionPage />
          </RutaPorRol>
        } /> */}

        {/* <Route path="/proveedores" element={
          <RutaPorRol roles={["Admin", "Bodega"]}>
            <ProveedoresPage />
          </RutaPorRol>
        } /> */}

        {/* <Route path="/contabilidad" element={
          <RutaPorRol roles={["Admin", "Bodega"]}>
            <ContabilidadPage />
          </RutaPorRol>
        } /> */}

        {/* <Route path="/reportes" element={
          <RutaPorRol roles={["Admin", "Bodega"]}>
            <ReportesPage />
          </RutaPorRol>
        } /> */}

        {/* Solo Admin */}
        {/* <Route path="/admin/usuarios" element={
          <RutaPorRol roles={["Admin"]}>
            <UsuariosPage />
          </RutaPorRol>
        } /> */}

        <Route path="/acceso-denegado" element={<AccesoDenegadoPage />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Error404Page />} />
    </Routes>
  );
};

export default AppRouter;