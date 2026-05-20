import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SidebarLink from "./SidebarLink";
import "./MenuItems.css";

// ─── Definición del menú ──────────────────────────────────────
// Cada ítem tiene: ruta, label, icono Material Symbols y roles
// que lo pueden ver.
const MENU = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    roles: ["Admin", "AdminBogota", "Bodega", "Entregador"],
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
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path: "/inventario",
    label: "Inventario",
    icon: "inventory_2",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path: "/productos",
    label: "Productos",
    icon: "category",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path: "/distribucion",
    label: "Distribución",
    icon: "sync_alt",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path: "/proveedores",
    label: "Proveedores",
    icon: "conveyor_belt",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path: "/contabilidad",
    label: "Contabilidad",
    icon: "account_balance",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path: "/reportes",
    label: "Reportes",
    icon: "assessment",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path: "/clientes",
    label: "Clientes",
    icon: "people",
    roles: ["Admin", "AdminBogota", "Bodega"],
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
  const location = useLocation();
  const { usuario, esBodegaBogota } = useAuth();
  const rol = usuario?.rol || "";

  const esActivo = (ruta) => location.pathname === ruta;

  // Filtrar según rol del usuario
  const menuFiltrado = MENU.filter((item) => item.roles.includes(rol));

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
      {esBodegaBogota && (
        <div className="menu-items__bogota-badge">
          <span className="material-symbols-outlined">verified</span>
          <span>Bodega Principal (Bogotá)</span>
        </div>
      )}
    </>
  );
}
