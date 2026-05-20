import { useReducer } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import MenuLateral from "@/components/layout/MenuLateral/MenuLateral";
import "./MenuSuperior.css";

const initialState = {
  mostrarSidebar: false,
};

function menuReducer(state, action) {
  switch (action.type) {
    case "ABRIR_SIDEBAR":
      return { ...state, mostrarSidebar: true };
    case "CERRAR_SIDEBAR":
      return { ...state, mostrarSidebar: false };
    default:
      return state;
  }
}

export default function MenuSuperior() {
  const [state, dispatch] = useReducer(menuReducer, initialState);
  const { mostrarSidebar } = state;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { usuario, logout, esAdmin } = useAuth();

  const sedeDesdeURL = searchParams.get("sede") || "";

  const abrirSidebar = () => dispatch({ type: "ABRIR_SIDEBAR" });
  const cerrarSidebar = () => dispatch({ type: "CERRAR_SIDEBAR" });

  const manejarCerrarSesion = () => {
    logout();
    cerrarSidebar();
    navigate("/login", { replace: true });
  };

  // Inicial del nombre para el avatar
  const inicial = usuario?.nombreCompleto?.charAt(0)?.toUpperCase() || "U";

  // Solo Admin puede cambiar de sede (ver todas)
  const puedeCambiarSede = esAdmin;

  return (
    <>
      <header className="menu-superior">
        <div className="menu-superior__izquierda">
          <button
            className="menu-superior__hamburger"
            onClick={abrirSidebar}
            aria-label="Abrir menú"
            type="button"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>

          <div className="menu-superior__brand">
            <span className="material-symbols-outlined menu-superior__brand-icon">
              local_shipping
            </span>
            <span className="menu-superior__brand-name">KATEPRAMAX</span>
            <span className="menu-superior__brand-sub">ERP Distribution</span>
          </div>
        </div>

        {/* Selector de sede - solo Admin ve todas las sedes */}
        {puedeCambiarSede && (
          <nav className="menu-superior__sedes d-none d-md-flex">
            {["Bogotá", "Cartagena", "Villavicencio"].map((sede) => (
              <button
                key={sede}
                className={`menu-superior__sede-btn ${
                  sedeDesdeURL === sede ? "menu-superior__sede-btn--activa" : ""
                }`}
                type="button"
                onClick={() => {
                  navigate(`/dashboard?sede=${sede}`, { replace: true });
                }}
              >
                {sede}
              </button>
            ))}
          </nav>
        )}

        {/* Acciones derechas */}
        <div className="menu-superior__acciones">
          <button
            className="menu-superior__icon-btn"
            type="button"
            aria-label="Notificaciones"
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>

          {/* Avatar + info usuario */}
          <div className="menu-superior__usuario">
            <div className="menu-superior__usuario-info d-none d-md-flex">
              <span className="menu-superior__usuario-rol">
                {usuario?.rol?.toUpperCase()}
              </span>
              <span className="menu-superior__usuario-nombre">
                {usuario?.nombreCompleto}
              </span>
            </div>
            <div className="menu-superior__avatar">{inicial}</div>
          </div>
        </div>
      </header>

      <MenuLateral
        mostrar={mostrarSidebar}
        cerrar={cerrarSidebar}
        cerrarSesion={manejarCerrarSesion}
      />
    </>
  );
}
