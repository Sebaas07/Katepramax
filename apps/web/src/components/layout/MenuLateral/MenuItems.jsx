import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import SidebarLink from "./SidebarLink";
import "./MenuItems.css";

/**
 * MENU — Definición centralizada.
 * Cada ítem declara los roles que lo pueden ver.
 * Si se agrega un rol nuevo, solo hay que actualizar aquí.
 */
const MENU = [
  {
    path:  "/dashboard",
    label: "Dashboard",
    icon:  "dashboard",
    roles: ["Admin", "AdminBogota", "Bodega", "Entregador"],
  },
  {
    path:  "/entregas",
    label: "Mis Entregas",
    icon:  "local_shipping",
    roles: ["Entregador"],
  },
  {
    path:  "/pedidos",
    label: "Pedidos",
    icon:  "shopping_cart",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path:  "/inventario",
    label: "Inventario",
    icon:  "inventory_2",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path:  "/productos",
    label: "Productos",
    icon:  "category",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path:  "/distribucion",
    label: "Distribución",
    icon:  "sync_alt",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path:  "/proveedores",
    label: "Proveedores",
    icon:  "conveyor_belt",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path:  "/clientes",
    label: "Clientes",
    icon:  "people",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path:  "/contabilidad",
    label: "Contabilidad",
    icon:  "account_balance",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  {
    path:  "/reportes",
    label: "Reportes",
    icon:  "assessment",
    roles: ["Admin", "AdminBogota", "Bodega"],
  },
  // Sección Admin
  {
    path:  "/admin/usuarios",
    label: "Usuarios",
    icon:  "group",
    roles: ["Admin"],
    seccion: "admin",
  },
  {
    path:  "/admin/audit-log",
    label: "Audit Log",
    icon:  "history_edu",
    roles: ["Admin"],
    seccion: "admin",
  },
];

export default function MenuItems({ cerrar }) {
  const location = useLocation();
  const { usuario, esAdminBogota } = useAuth();
  const rol = usuario?.rol ?? "";

  const menuFiltrado = MENU.filter((item) => item.roles.includes(rol));

  // Separar sección admin del resto para mostrar un divisor
  const menuGeneral = menuFiltrado.filter((i) => i.seccion !== "admin");
  const menuAdmin   = menuFiltrado.filter((i) => i.seccion === "admin");

  return (
    <>
      {menuGeneral.map((item) => (
        <SidebarLink
          key={item.path}
          icon={item.icon}
          label={item.label}
          to={item.path}
          activo={location.pathname === item.path}
          onClick={cerrar}
        />
      ))}

      {menuAdmin.length > 0 && (
        <>
          <div className="menu-items__seccion-divider">
            <span>Administración</span>
          </div>
          {menuAdmin.map((item) => (
            <SidebarLink
              key={item.path}
              icon={item.icon}
              label={item.label}
              to={item.path}
              activo={location.pathname === item.path}
              onClick={cerrar}
            />
          ))}
        </>
      )}

      {/* Badge Bodega Principal solo para AdminBogota */}
      {esAdminBogota && (
        <div className="menu-items__bogota-badge">
          <span className="material-symbols-outlined">verified</span>
          <span>Bodega Principal · Bogotá</span>
        </div>
      )}
    </>
  );
}
