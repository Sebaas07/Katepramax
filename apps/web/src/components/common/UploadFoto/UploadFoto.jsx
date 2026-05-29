import { useRef, useState } from "react";
import "./UploadFoto.css";

/**
 * UploadFoto — Katepramax
 * Componente reutilizable para captura de foto desde cámara o galería.
 * Optimizado para uso en móvil (entregadores).
 *
 * Props:
 *  onArchivoSeleccionado  (archivo: File) => void   — callback con el archivo
 *  urlPrevia              string | null              — URL de foto ya subida
 *  obligatorio            boolean (default true)
 *  etiqueta               string (default "Foto de evidencia")
 *  disabled               boolean
 */
const UploadFoto = ({
  onArchivoSeleccionado,
  urlPrevia = null,
  obligatorio = true,
  etiqueta = "Foto de evidencia",
  disabled = false,
}) => {
  const inputRef = useRef(null);
  const [previstaLocal, setPrevistaLocal] = useState(null);
  const [error, setError] = useState(null);

  const urlMostrar = previstaLocal ?? urlPrevia;

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleCambio = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Validar tipo
    if (!archivo.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen.");
      return;
    }

    // Validar tamaño máximo 10MB
    if (archivo.size > 10 * 1024 * 1024) {
      setError("La imagen no puede superar 10MB.");
      return;
    }

    setError(null);
    const objetoURL = URL.createObjectURL(archivo);
    setPrevistaLocal(objetoURL);
    onArchivoSeleccionado?.(archivo);

    // Resetear input para permitir seleccionar el mismo archivo de nuevo
    e.target.value = "";
  };

  const handleEliminar = (e) => {
    e.stopPropagation();
    setPrevistaLocal(null);
    onArchivoSeleccionado?.(null);
    setError(null);
  };

  return (
    <div className="upload-foto">
      {/* Etiqueta */}
      <label className="upload-foto__label">
        {etiqueta}
        {obligatorio && <span className="upload-foto__req"> *</span>}
      </label>

      {/* Área de clic */}
      <div
        className={`upload-foto__area ${urlMostrar ? "upload-foto__area--con-foto" : ""} ${disabled ? "upload-foto__area--disabled" : ""}`}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        aria-label="Seleccionar foto"
      >
        {urlMostrar ? (
          <>
            <img
              src={urlMostrar}
              alt="Foto de evidencia"
              className="upload-foto__preview"
            />
            {/* Overlay con botón de cambio */}
            {!disabled && (
              <div className="upload-foto__overlay">
                <span className="material-symbols-outlined">photo_camera</span>
                <span className="upload-foto__overlay-texto">Cambiar foto</span>
              </div>
            )}
            {/* Botón eliminar */}
            {!disabled && (
              <button
                type="button"
                className="upload-foto__eliminar"
                onClick={handleEliminar}
                aria-label="Eliminar foto"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </>
        ) : (
          <div className="upload-foto__placeholder">
            <div className="upload-foto__icono-wrap">
              <span className="material-symbols-outlined upload-foto__icono">
                photo_camera
              </span>
            </div>
            <p className="upload-foto__texto-principal">
              Toca para tomar foto
            </p>
            <p className="upload-foto__texto-secundario">
              o elegir de la galería · Máx 10MB
            </p>
          </div>
        )}
      </div>

      {/* Input oculto — capture="environment" abre cámara trasera en móvil */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCambio}
        disabled={disabled}
        style={{ display: "none" }}
        aria-hidden="true"
      />

      {/* Error */}
      {error && (
        <p className="upload-foto__error">
          <span className="material-symbols-outlined">error</span>
          {error}
        </p>
      )}
    </div>
  );
};

export default UploadFoto;
