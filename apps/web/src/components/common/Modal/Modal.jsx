import { useState, useEffect } from "react";
import "./Modal.css";

const Modal = ({ 
  isOpen, 
  onClose, 
  titulo, 
  children, 
  textoBotonConfirmar = "Confirmar", 
  textoBotonCancelar = "Cancelar",
  onConfirmar,
  mostrarCancelar = true
}) => {
  const [isConfirmed, setIsConfirmed] = useState(false);

  const handleConfirmar = () => {
    if (onConfirmar) {
      onConfirmar();
    }
    setIsConfirmed(true);
    onClose();
  };

  const handleCancelar = () => {
    setIsConfirmed(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={handleCancelar}>
        <div 
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h5 className="modal-title">{titulo}</h5>
            <button 
              className="modal-close"
              onClick={handleCancelar}
              aria-label="Cerrar"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="modal-body">
            {children}
          </div>
          
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
              disabled={isConfirmed}
            >
              {isConfirmed ? "Procesando..." : textoBotonConfirmar}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;