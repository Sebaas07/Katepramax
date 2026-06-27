import { useEffect, useRef } from "react";
import "./Modal.css";

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
  const modalRef = useRef(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleConfirmar = () => {
    if (onConfirmar) {
      onConfirmar();
    }
  };

  const handleCancelar = () => {
    onCloseRef.current();
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onCloseRef.current();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    // Foco inicial al abrir, una sola vez por apertura del modal.
    const timer = window.setTimeout(() => modalRef.current?.focus(), 50);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={handleCancelar}>
        <div
          ref={modalRef}
          className={`modal-content ${className}`}
          style={maxWidth ? { maxWidth } : undefined}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-titulo"
          tabIndex={-1}
        >
          <div className="modal-header">
            <h5 className="modal-title" id="modal-titulo">
              {titulo}
            </h5>
            <button
              className="modal-close"
              onClick={handleCancelar}
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="modal-body">{children}</div>

          <div className="modal-footer">
            {mostrarCancelar && (
              <button
                className="modal-btn modal-btn--cancelar"
                onClick={handleCancelar}
              >
                {textoBotonCancelar}
              </button>
            )}
            <button
              className="modal-btn modal-btn--confirmar"
              onClick={handleConfirmar}
              disabled={disabled}
            >
              {textoBotonConfirmar}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
