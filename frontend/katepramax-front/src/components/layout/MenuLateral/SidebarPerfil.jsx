import SidebarLink from "./SidebarLink";
import "./SidebarPerfil.css";

export default function SidebarPerfil({ usuario, cerrarSesion }) {
  const inicial = usuario?.nombreCompleto?.charAt(0)?.toUpperCase() || "U";

  const ROL_CONFIG = {
    Admin:      { label: "Administrador", color: "#ddb7ff", bg: "rgba(221,183,255,0.12)" },
    Bodega:     { label: "Bodega",        color: "#e9c349", bg: "rgba(233,195,73,0.12)"  },
    Entregador: { label: "Entregador",    color: "#4ade80", bg: "rgba(74,222,128,0.12)"  },
  };

  const config = ROL_CONFIG[usuario?.rol] || ROL_CONFIG.Bodega;

  return (
    <div className="sidebar-perfil">
      {/* Info del usuario */}
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

      {/* Sede activa */}
      {usuario?.sede && (
        <div className="sidebar-perfil__sede">
          <span className="material-symbols-outlined">location_on</span>
          <span>Sede {usuario.sede}</span>
        </div>
      )}

      {/* Cerrar sesión */}
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