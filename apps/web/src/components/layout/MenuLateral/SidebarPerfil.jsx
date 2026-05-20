import { useAuth } from "@/hooks/useAuth";
import SidebarLink from "./SidebarLink";
import "./SidebarPerfil.css";

export default function SidebarPerfil({ cerrarSesion }) {
  // 1. Traemos esBodegaBogota del contexto
  const { usuario, esBodegaBogota } = useAuth();

  const inicial = usuario?.nombreCompleto?.charAt(0)?.toUpperCase() || "U";

  // Función segura para obtener el nombre de la sede
  const obtenerNombreSede = () => {
    if (!usuario?.sede) return "";

    // Si es objeto con propiedad nombre
    if (typeof usuario.sede === "object" && usuario.sede !== null) {
      return usuario.sede.nombre || usuario.sede.name || "";
    }

    // Si es string directamente
    return usuario.sede;
  };

  const ROL_CONFIG = {
    Admin: {
      label: "Administrador",
      color: "#ddb7ff",
      bg: "rgba(221,183,255,0.12)",
    },
    AdminBogota: {
      label: "Bodega Bogotá",
      color: "#e9c349",
      bg: "rgba(233,195,73,0.12)",
    },
    Bodega: { label: "Bodega", color: "#e9c349", bg: "rgba(233,195,73,0.12)" },
    Entregador: {
      label: "Entregador",
      color: "#4ade80",
      bg: "rgba(74,222,128,0.12)",
    },
  };

  // 2. Si es Bodega Bogotá, usamos su configuración de rol, si no, el rol normal del usuario
  const config = esBodegaBogota
    ? ROL_CONFIG.AdminBogota
    : ROL_CONFIG[usuario?.rol] || ROL_CONFIG.Bodega;

  // 3. Reutilizamos la variable global para el texto de la sede
  const sedeMostrar = esBodegaBogota
    ? "Bogotá (Principal)"
    : obtenerNombreSede();

  return (
    <div className="sidebar-perfil">
      <div className="sidebar-perfil__info">
        <div className="sidebar-perfil__avatar">{inicial}</div>
        <div className="sidebar-perfil__datos">
          <span className="sidebar-perfil__nombre">
            {usuario?.nombreCompleto || "Usuario"}
          </span>
          <span
            className="sidebar-perfil__rol"
            style={{ color: config.color, backgroundColor: config.bg }}
          >
            {config.label}
          </span>
        </div>
      </div>

      {/* Mostrar sede solo si existe y es string válido */}
      {sedeMostrar && sedeMostrar !== "" && (
        <div className="sidebar-perfil__sede">
          <span className="material-symbols-outlined">location_on</span>
          <span>Sede {sedeMostrar}</span>
        </div>
      )}

      <SidebarLink
        icon="logout"
        label="Cerrar sesión"
        esBoton={true}
        onClick={cerrarSesion}
        className="sidebar-link--logout"
      />
    </div>
  );
}
