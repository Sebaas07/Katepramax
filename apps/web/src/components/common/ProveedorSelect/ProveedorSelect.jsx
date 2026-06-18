import { useCallback, useEffect, useMemo, useId, useRef, useState } from "react";
import proveedoresService from "@/services/proveedores.service";
import "./ProveedorSelect.css";

const normalizeProveedor = (proveedor) => ({
  id: String(proveedor.id),
  label: proveedor.nombre || proveedor.descripcion || `Proveedor ${proveedor.id}`,
  activo: proveedor.activo,
});

const ProveedorSelect = ({
  value,
  onChange,
  disabled = false,
  placeholder = "— Buscar proveedor —",
}) => {
  const id = useId();
  const wrapperRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [proveedores, setProveedores] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const cargarProveedores = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const data = await proveedoresService.obtenerProveedores({
        activo: "true",
        take: 200,
      });
      setProveedores(Array.isArray(data) ? data.map(normalizeProveedor) : []);
    } catch (err) {
      setError(err?.message || "No fue posible cargar los proveedores.");
      setProveedores([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void cargarProveedores();
    }, 0);

    return () => window.clearTimeout(id);
  }, [cargarProveedores]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectedProveedor = useMemo(
    () => proveedores.find((proveedor) => proveedor.id === value),
    [proveedores, value],
  );

  const proveedoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return proveedores;

    return proveedores.filter((proveedor) =>
      proveedor.label.toLowerCase().includes(termino),
    );
  }, [busqueda, proveedores]);

  const handleAbrir = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  }, [disabled]);

  const handleSeleccionar = useCallback(
    (proveedorId) => {
      onChange(proveedorId);
      setIsOpen(false);
      setBusqueda("");
    },
    [onChange],
  );

  const handleLimpiar = useCallback(
    (event) => {
      event.stopPropagation();
      onChange("");
      setBusqueda("");
    },
    [onChange],
  );

  const handleTecla = useCallback(
    (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }

      if (event.key === "Enter" && isOpen && proveedoresFiltrados[0]) {
        event.preventDefault();
        handleSeleccionar(proveedoresFiltrados[0].id);
      }
    },
    [handleSeleccionar, isOpen, proveedoresFiltrados],
  );

  return (
    <div
      className="proveedor-select"
      ref={wrapperRef}
      onKeyDown={handleTecla}
    >
      <button
        id={id}
        className="proveedor-select__trigger"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={handleAbrir}
      >
        <span className="proveedor-select__label">
          {selectedProveedor?.label || placeholder}
        </span>
        <span className="proveedor-select__meta">
          {selectedProveedor ? "Proveedor seleccionado" : "Buscar proveedor"}
        </span>
        <span className="material-symbols-outlined proveedor-select__icon">
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <div className="proveedor-select__popover" role="listbox">
          <div className="proveedor-select__search">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre..."
              autoFocus
            />
            {selectedProveedor && (
              <button
                type="button"
                className="proveedor-select__clear"
                onClick={handleLimpiar}
                aria-label="Limpiar proveedor"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>

          {cargando && (
            <div className="proveedor-select__loading">
              <span className="proveedor-select__mini-spinner" />
              Cargando proveedores...
            </div>
          )}

          {!cargando && error && (
            <div className="proveedor-select__error">
              <span>{error}</span>
              <button type="button" onClick={cargarProveedores}>
                Reintentar
              </button>
            </div>
          )}

          {!cargando && !error && proveedoresFiltrados.length === 0 && (
            <div className="proveedor-select__empty">
              <span className="material-symbols-outlined">inventory_2</span>
              {busqueda ? "No hay proveedores que coincidan." : "No hay proveedores activos."}
            </div>
          )}

          {!cargando && !error && (
            <div className="proveedor-select__list">
              {proveedoresFiltrados.map((proveedor) => (
                <button
                  key={proveedor.id}
                  type="button"
                  role="option"
                  aria-selected={proveedor.id === value}
                  className={`proveedor-select__option ${
                    proveedor.id === value ? "proveedor-select__option--active" : ""
                  }`}
                  onClick={() => handleSeleccionar(proveedor.id)}
                >
                  <span>{proveedor.label}</span>
                  <small>{proveedor.activo ? "Activo" : "Inactivo"}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProveedorSelect;
