import { useReducer } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import MenuLateral from "@/components/layout/MenuLateral/MenuLateral";
import "./MenuSuperior.css";

const SEDES = ["Bogotá", "Cartagena", "Villavicencio"];

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
  const [{ mostrarSidebar }, dispatch] = useReducer(menuReducer, {
    mostrarSidebar: false,
  });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { usuario, logout, esAdmin, esBodega } = useAuth();

  const sedeDesdeURL = searchParams.get("sede") || "";
  const abrirSidebar = () => dispatch({ type: "ABRIR_SIDEBAR" });
  const cerrarSidebar = () => dispatch({ type: "CERRAR_SIDEBAR" });

  const manejarCerrarSesion = async () => {
    cerrarSidebar();
    await logout();
    navigate("/login", { replace: true });
  };

  const inicial = usuario?.nombreCompleto?.charAt(0)?.toUpperCase() || "U";
  const sedeNombre =
    typeof usuario?.sede === "object"
      ? usuario.sede.nombre
      : (usuario?.sede ?? "");

  // Bodega ve su sede como chip (no como selector)
  const sedeChip = esBodega && !esAdmin && sedeNombre;

  return (
    <>
      <header className="menu-superior">
        {/* ── Izquierda: hamburger + brand ── */}
        <div className="menu-superior__izquierda">
          <button
            className="menu-superior__hamburger"
            onClick={abrirSidebar}
            aria-label="Abrir menú de navegación"
            aria-expanded={mostrarSidebar}
            type="button"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              menu
            </span>
          </button>

          <div className="menu-superior__brand" aria-label="Katepramax ERP">
            <span
              className="material-symbols-outlined menu-superior__brand-icon"
              aria-hidden="true"
            >
              local_shipping
            </span>
            <span className="menu-superior__brand-name">KATEPRAMAX</span>
            <span className="menu-superior__brand-sub d-none d-sm-inline-block">
              ERP Distribution
            </span>
          </div>
        </div>

        {/* ── Centro: selector de sede (Admin) o chip de sede (Bodega) ── */}
        {esAdmin && (
          <nav
            className="menu-superior__sedes d-none d-md-flex"
            aria-label="Selector de sede"
          >
            {SEDES.map((sede) => (
              <button
                key={sede}
                className={`menu-superior__sede-btn ${sedeDesdeURL === sede ? "menu-superior__sede-btn--activa" : ""}`}
                type="button"
                onClick={() =>
                  navigate(`/dashboard?sede=${sede}`, { replace: true })
                }
                aria-pressed={sedeDesdeURL === sede}
              >
                {sede}
              </button>
            ))}
          </nav>
        )}

        {sedeChip && (
          <div
            className="menu-superior__sede-chip d-none d-md-flex"
            aria-label={`Sede ${sedeNombre}`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              location_on
            </span>
            <span>{sedeNombre}</span>
          </div>
        )}

        {/* ── Derecha: notificaciones + usuario ── */}
        <div className="menu-superior__acciones">
          <button
            className="menu-superior__icon-btn"
            type="button"
            aria-label="Notificaciones"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              notifications
            </span>
          </button>

          <div className="menu-superior__usuario">
            <div className="menu-superior__usuario-info d-none d-md-flex">
              <span className="menu-superior__usuario-rol">
                {usuario?.rol?.toUpperCase()}
              </span>
              <span className="menu-superior__usuario-nombre">
                {usuario?.nombreCompleto}
              </span>
            </div>
            <div
              className="menu-superior__avatar"
              aria-label={`Avatar de ${usuario?.nombreCompleto}`}
              title={usuario?.nombreCompleto}
            >
              {inicial}
            </div>
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
