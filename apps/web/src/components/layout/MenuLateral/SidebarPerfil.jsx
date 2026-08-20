import { useAuth } from "@/hooks/useAuth";
import SidebarLink from "./SidebarLink";
import "./SidebarPerfil.css";

// Constante estática hoistada — no depende de estado ni props
const ROL_CONFIG = {
  Admin: {
    label: "Administrador",
    color: "#ddb7ff",
    bg: "rgba(221,183,255,0.12)",
  },
  AdminBogota: {
    label: "Admin Bogotá",
    color: "#e9c349",
    bg: "rgba(233,195,73,0.12)",
  },
  Bodega: { label: "Bodega", color: "#e9c349", bg: "rgba(233,195,73,0.12)" },
  Oficinista: {
    label: "Oficinista",
    color: "#60a5fa",
    bg: "rgba(96,165,250,0.12)",
  },
  Entregador: {
    label: "Entregador",
    color: "#4ade80",
    bg: "rgba(74,222,128,0.12)",
  },
};

// Función pura hoistada — no usa estado ni props del componente
const obtenerNombreSede = (sede) => {
  if (!sede) return "";
  if (typeof sede === "object" && sede !== null) {
    return sede.nombre || sede.name || "";
  }
  return sede;
};

export default function SidebarPerfil({ cerrarSesion }) {
  const { usuario, esBodegaBogota } = useAuth();

  const inicial = usuario?.nombreCompleto?.charAt(0)?.toUpperCase() || "U";
  const config = esBodegaBogota
    ? ROL_CONFIG.AdminBogota
    : ROL_CONFIG[usuario?.rol] || ROL_CONFIG.Bodega;
  const sedeMostrar = esBodegaBogota
    ? "Bogotá (Principal)"
    : obtenerNombreSede(usuario?.sede);

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

      {sedeMostrar && (
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
