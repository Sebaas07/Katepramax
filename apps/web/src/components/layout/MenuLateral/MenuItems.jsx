import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import envioService from "@/services/envio.service";
import pedidosService from "@/services/pedidos.service";
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
    roles: ["Admin", "AdminBogota", "Bodega", "Oficinista", "Entregador"],
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
    roles: ["Admin", "AdminBogota", "Oficinista"],
  },
  {
    path:  "/inventario",
    label: "Inventario",
    icon:  "inventory_2",
    roles: ["Admin", "AdminBogota", "Bodega", "Oficinista"],
  },
  {
    path:  "/productos",
    label: "Productos",
    icon:  "category",
    roles: ["Admin", "AdminBogota", "Oficinista"],
  },
  {
    path:  "/distribucion",
    label: "Distribución y Entregas",
    icon:  "sync_alt",
    roles: ["Admin", "AdminBogota", "Oficinista", "Bodega"],
    notificablePedidos: true,
  },
  {
    path:  "/envios",
    label: "Envíos entre Sedes",
    icon:  "local_shipping",
    roles: ["Admin", "AdminBogota", "Oficinista"],
    notificable: true,
  },
  {
    path:  "/clientes",
    label: "Clientes",
    icon:  "people",
    roles: ["Admin", "AdminBogota", "Oficinista"],
  },
  {
    path:  "/proveedores",
    label: "Proveedores",
    icon:  "factory",
    roles: ["Admin", "AdminBogota", "Oficinista"],
  },
  {
    path:  "/contabilidad",
    label: "Contabilidad",
    icon:  "account_balance",
    roles: ["Admin", "AdminBogota", "Oficinista"],
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
    path:  "/admin/sedes",
    label: "Sedes",
    icon:  "location_city",
    roles: ["Admin"],
    seccion: "admin",
  },
  {
    path:  "/admin/logs",
    label: "Historial de Acciones",
    icon:  "history",
    roles: ["Admin"],
    seccion: "admin",
  }
];

export default function MenuItems({ cerrar }) {
  const location = useLocation();
  const { usuario, esAdminBogota, isAuthenticated, isSessionChecked } = useAuth();
  const rol = usuario?.rol ?? "";
  const [enviosPendientes, setEnviosPendientes] = useState(0);
  const [pedidosPendientes, setPedidosPendientes] = useState(0);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    if (!["Admin", "AdminBogota", "Oficinista"].includes(rol)) return;

    let activo = true;
    const cargar = () => {
      envioService.obtenerPendientesCount().then((n) => {
        if (activo) setEnviosPendientes(n);
      });
    };
    cargar();
    // Refresca cada minuto — es la "notificación" de que llegó un envío nuevo
    const id = window.setInterval(cargar, 60000);
    return () => {
      activo = false;
      window.clearInterval(id);
    };
  }, [isSessionChecked, isAuthenticated, rol]);

  // Notificación de pedidos pendientes por asignar: cuando una oficina crea
  // un pedido, la Bodega/Oficinista ve el contador aquí para asignar entregador.
  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    if (!["Admin", "AdminBogota", "Oficinista", "Bodega"].includes(rol)) return;

    let activo = true;
    const cargar = () => {
      pedidosService.obtenerPendientesCount().then((n) => {
        if (activo) setPedidosPendientes(n);
      });
    };
    cargar();
    const id = window.setInterval(cargar, 60000);
    return () => {
      activo = false;
      window.clearInterval(id);
    };
  }, [isSessionChecked, isAuthenticated, rol]);

  const menuFiltrado = MENU.filter((item) => item.roles.includes(rol));

  // Separar sección admin del resto para mostrar un divisor
  const menuGeneral = menuFiltrado.filter((i) => i.seccion !== "admin");
  const menuAdmin   = menuFiltrado.filter((i) => i.seccion === "admin");

  const badgeDe = (item) => {
    if (item.notificable) return enviosPendientes;
    if (item.notificablePedidos) return pedidosPendientes;
    return 0;
  };

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
          badge={badgeDe(item)}
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
