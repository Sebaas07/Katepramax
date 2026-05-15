import { Offcanvas } from "react-bootstrap";
import { obtenerSesion } from "@/utils/sessionHelper";
import MenuItems from "./MenuItems";
import SidebarPerfil from "./SidebarPerfil";
import "./MenuLateral.css";

export default function MenuLateral({ mostrar, cerrar, cerrarSesion }) {
  const usuario = obtenerSesion();

  return (
    <Offcanvas
      show={mostrar}
      onHide={cerrar}
      placement="start"
      className="menu-lateral"
      backdrop={true}
      keyboard={true}
    >
      {/* Header del sidebar */}
      <Offcanvas.Header className="menu-lateral__header">
        <div className="menu-lateral__brand">
          <span className="material-symbols-outlined menu-lateral__brand-icon">
            local_shipping
          </span>
          <div className="menu-lateral__brand-texts">
            <span className="menu-lateral__brand-name">KATEPRAMAX</span>
            <span className="menu-lateral__brand-sub">ERP Distribution</span>
          </div>
        </div>
        <button
          className="menu-lateral__close"
          onClick={cerrar}
          type="button"
          aria-label="Cerrar menú"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </Offcanvas.Header>

      <Offcanvas.Body className="menu-lateral__body">
        <nav className="menu-lateral__nav">
          {/* Items de navegación filtrados por rol */}
          <div className="menu-lateral__items">
            <MenuItems cerrar={cerrar} />
          </div>

          {/* Perfil + logout al fondo */}
          <div className="menu-lateral__footer">
            <SidebarPerfil usuario={usuario} cerrarSesion={cerrarSesion} />
          </div>
        </nav>
      </Offcanvas.Body>
    </Offcanvas>
  );
}