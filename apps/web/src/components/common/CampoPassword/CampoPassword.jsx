import { useState } from "react";
import "./CampoPassword.css";

/**
 * CampoPassword — input de contraseña con ojo para mostrar/ocultar.
 * Mantiene la misma firma que un <input> nativo (name, value, onChange)
 * para poder usarlo dentro de los formularios existentes sin cambios.
 */
const CampoPassword = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  autoComplete,
  disabled = false,
  className = "",
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`campo-password ${className}`}>
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        className="form-control campo-password__input"
      />
      <button
        type="button"
        className="campo-password__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        tabIndex={-1}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {visible ? "visibility_off" : "visibility"}
        </span>
      </button>
    </div>
  );
};

export default CampoPassword;