import { useLocation } from "react-router-dom";
import { obtenerSesion, esBodegaBogota } from "@/utils/sessionHelper";
import SidebarLink from "./SidebarLink";
import "./MenuItems.css";

// ─── Definición del menú ──────────────────────────────────────
// Cada ítem tiene: ruta, label, icono Material Symbols y roles
// que lo pueden ver. Si roles es null = todos los logueados.
const MENU = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    roles: ["AdminBogota", "Admin", "Bodega"],
  },
  {
    path: "/entregas",
    label: "Mis Entregas",
    icon: "local_shipping",
    roles: ["Entregador"],
  },
  {
    path: "/pedidos",
    label: "Pedidos",
    icon: "shopping_cart",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/entregas",
    label: "Entregas",
    icon: "local_shipping",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/inventario",
    label: "Inventario",
    icon: "inventory_2",
    roles: ["AdminBogota", "Admin", "Bodega"],
  },
  {
    path: "/productos",
    label: "Productos",
    icon: "category",
    roles: ["AdminBogota", "Admin", "Bodega"],
  },
  {
    path: "/distribucion",
    label: "Distribución",
    icon: "sync_alt",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/proveedores",
    label: "Proveedores",
    icon: "conveyor_belt",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/contabilidad",
    label: "Contabilidad",
    icon: "account_balance",
    roles: ["AdminBogota", "Admin", "Bodega"],
  },
  {
    path: "/reportes",
    label: "Reportes",
    icon: "assessment",
    roles: ["Admin", "Bodega"],
  },
  {
    path: "/admin/usuarios",
    label: "Usuarios",
    icon: "group",
    roles: ["Admin"],
  },
  {
    path: "/admin/audit-log",
    label: "Audit Log",
    icon: "history_edu",
    roles: ["Admin"],
  },
];

export default function MenuItems({ cerrar }) {
  const location  = useLocation();
  const usuario   = obtenerSesion();
  const esBogota  = esBodegaBogota();
  const rol       = usuario?.rol || "";

  const esActivo  = (ruta) => location.pathname === ruta;

  // Filtrar según rol
  const menuFiltrado = MENU.filter((item) =>
    item.roles.includes(rol)
  );

  return (
    <>
      {menuFiltrado.map((item) => (
        <SidebarLink
          key={item.path + item.label}
          icon={item.icon}
          label={item.label}
          to={item.path}
          activo={esActivo(item.path)}
          onClick={cerrar}
        />
      ))}

      {/* Badge especial para Bodega Bogotá */}
      {esBogota && (
        <div className="menu-items__bogota-badge">
          <span className="material-symbols-outlined">verified</span>
          <span>Bodega Principal</span>
        </div>
      )}
    </>
  );
}