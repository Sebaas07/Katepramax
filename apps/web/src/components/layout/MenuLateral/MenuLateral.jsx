// src/components/layout/MenuLateral/MenuLateral.jsx
import { Offcanvas } from "react-bootstrap";
import MenuItems from "./MenuItems";
import SidebarPerfil from "./SidebarPerfil";
import "./MenuLateral.css";

export default function MenuLateral({ mostrar, cerrar, cerrarSesion }) {
  return (
    <Offcanvas
      show={mostrar}
      onHide={cerrar}
      placement="start"
      className="menu-lateral"
      backdrop={true}
      keyboard={true}
    >
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
          <div className="menu-lateral__items">
            <MenuItems cerrar={cerrar} />
          </div>
          <div className="menu-lateral__footer">
            <SidebarPerfil cerrarSesion={cerrarSesion} />
          </div>
        </nav>
      </Offcanvas.Body>
    </Offcanvas>
  );
}