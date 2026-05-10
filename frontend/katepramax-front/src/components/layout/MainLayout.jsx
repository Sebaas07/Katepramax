import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { obtenerSesion, cerrarSesion } from "@/utils/sessionHelper";

// ─── Definición del menú ──────────────────────────────────────────────────────
// Cada ítem tiene la ruta, el label, el ícono y los roles que lo pueden ver.
// Cuando creemos una página nueva, solo hay que agregar su ítem aquí.
const MENU_ITEMS = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: "bi-speedometer2",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/entregas",
    label: "Mis Entregas",
    icon: "bi-truck",
    roles: ["Entregador"],
  },
  {
    path: "/pedidos",
    label: "Pedidos",
    icon: "bi-clipboard2-check",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/entregas",
    label: "Entregas",
    icon: "bi-truck",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/inventario",
    label: "Inventario",
    icon: "bi-box-seam",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/productos",
    label: "Productos",
    icon: "bi-upc-scan",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/distribucion",
    label: "Distribución",
    icon: "bi-arrow-left-right",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/proveedores",
    label: "Proveedores",
    icon: "bi-building",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/contabilidad",
    label: "Contabilidad",
    icon: "bi-cash-stack",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/reportes",
    label: "Reportes",
    icon: "bi-bar-chart-line",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/admin/usuarios",
    label: "Usuarios",
    icon: "bi-people",
    roles: ["Admin"],
  },
];

// Badge de rol con color por sede/rol
const ROL_CONFIG = {
  Admin:      { color: "#dc2626", bg: "#fef2f2", label: "Administrador" },
  Bodega:     { color: "#2563eb", bg: "#eff6ff", label: "Bodega" },
  Entregador: { color: "#16a34a", bg: "#f0fdf4", label: "Entregador" },
};

const MainLayout = () => {
  const navigate = useNavigate();
  const usuario = obtenerSesion();
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

  // Filtrar menú según rol del usuario logueado
  const menuFiltrado = MENU_ITEMS.filter((item) =>
    item.roles.includes(usuario?.rol)
  );

  const rolConfig = ROL_CONFIG[usuario?.rol] || ROL_CONFIG.Bodega;

  const handleLogout = () => {
    cerrarSesion();
    navigate("/login", { replace: true });
  };

  return (
    <div className="main-layout">

      {/* Overlay oscuro detrás del sidebar en móvil */}
      {sidebarAbierto && (
        <div
          className="sidebar-overlay d-lg-none"
          onClick={() => setSidebarAbierto(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarAbierto ? "sidebar--open" : ""}`}>

        {/* Logo */}
        <div className="sidebar__logo">
          <div className="sidebar__logo-icon">
            <i className="bi bi-shop-window"></i>
          </div>
          <span className="sidebar__logo-text">Katepramax</span>
        </div>

        {/* Info del usuario */}
        <div className="sidebar__user">
          <div className="sidebar__user-avatar">
            {usuario?.nombreCompleto?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="sidebar__user-info">
            <span className="sidebar__user-name">{usuario?.nombreCompleto}</span>
            <span
              className="sidebar__user-role"
              style={{ color: rolConfig.color, backgroundColor: rolConfig.bg }}
            >
              {rolConfig.label}
            </span>
          </div>
        </div>

        {/* Sede activa */}
        {usuario?.sede && (
          <div className="sidebar__sede">
            <i className="bi bi-geo-alt-fill"></i>
            <span>{usuario.sede}</span>
          </div>
        )}

        <hr className="sidebar__divider" />

        {/* Navegación */}
        <nav className="sidebar__nav">
          {menuFiltrado.map((item) => (
            <NavLink
              key={item.path + item.label}
              to={item.path}
              className={({ isActive }) =>
                `sidebar__nav-item ${isActive ? "sidebar__nav-item--active" : ""}`
              }
              onClick={() => setSidebarAbierto(false)}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Cerrar sesión */}
        <div className="sidebar__footer">
          <button
            className="sidebar__logout"
            onClick={handleLogout}
            type="button"
          >
            <i className="bi bi-box-arrow-left"></i>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Área de contenido ────────────────────────────────────────────── */}
      <div className="main-content">

        {/* Topbar solo visible en móvil */}
        <header className="topbar d-lg-none">
          <button
            className="topbar__menu-btn"
            onClick={() => setSidebarAbierto(!sidebarAbierto)}
            type="button"
          >
            <i className="bi bi-list"></i>
          </button>
          <span className="topbar__title">Katepramax</span>
          <div className="topbar__avatar">
            {usuario?.nombreCompleto?.charAt(0)?.toUpperCase() || "U"}
          </div>
        </header>

        {/* Aquí se renderiza la página activa */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;