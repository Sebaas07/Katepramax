import { NavLink } from "react-router-dom";
import "./SidebarLink.css";

/**
 * SidebarLink — ítem de navegación del sidebar.
 * Puede ser un NavLink (navegación) o un botón (acción como logout).
 */
export default function SidebarLink({
  icon,
  label,
  to,
  onClick,
  esBoton = false,
  className = "",
  activo = false,
}) {
  if (esBoton) {
    return (
      <button
        className={`sidebar-link ${className}`}
        onClick={onClick}
        type="button"
      >
        <span className="material-symbols-outlined sidebar-link__icon">
          {icon}
        </span>
        <span className="sidebar-link__label">{label}</span>
      </button>
    );
  }

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `sidebar-link ${isActive || activo ? "sidebar-link--activo" : ""} ${className}`
      }
    >
      <span className="material-symbols-outlined sidebar-link__icon">
        {icon}
      </span>
      <span className="sidebar-link__label">{label}</span>
    </NavLink>
  );
}