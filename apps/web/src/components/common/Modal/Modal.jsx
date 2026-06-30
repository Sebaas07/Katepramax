import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

/**
 * Modal — Katepramax
 * Usa <dialog> nativo: focus trap, Escape y backdrop incluidos.
 * Renderizado con Portal en document.body para evitar problemas de
 * stacking context con position:sticky / z-index en el layout.
 */
const Modal = ({
  isOpen,
  onClose,
  titulo,
  children,
  textoBotonConfirmar = "Confirmar",
  textoBotonCancelar = "Cancelar",
  onConfirmar,
  mostrarCancelar = true,
  disabled = false,
  className = "",
  maxWidth,
}) => {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Abrir / cerrar el <dialog> nativo según la prop isOpen
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = "hidden";
    } else {
      if (dialog.open) dialog.close();
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // El evento "cancel" se dispara con Escape; lo redirigimos a onClose
  const handleCancel = (e) => {
    e.preventDefault();
    onCloseRef.current();
  };

  const handleConfirmar = () => {
    if (onConfirmar) onConfirmar();
  };

  // Clic en el backdrop (fuera de .modal-content) cierra el modal
  const handleBackdropClick = (e) => {
    if (e.target === dialogRef.current) {
      onCloseRef.current();
    }
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="modal-dialog"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby="modal-titulo"
    >
      <div
        className={`modal-content ${className}`}
        style={maxWidth ? { maxWidth } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h5 className="modal-title" id="modal-titulo">
            {titulo}
          </h5>
          <button
            type="button"
            className="modal-close"
            onClick={() => onCloseRef.current()}
            aria-label="Cerrar"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-body">{children}</div>

        <div className="modal-footer">
          {mostrarCancelar && (
            <button
              type="button"
              className="modal-btn modal-btn--cancelar"
              onClick={() => onCloseRef.current()}
            >
              {textoBotonCancelar}
            </button>
          )}
          <button
            type="button"
            className="modal-btn modal-btn--confirmar"
            onClick={handleConfirmar}
            disabled={disabled}
          >
            {textoBotonConfirmar}
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
};

export default Modal;
