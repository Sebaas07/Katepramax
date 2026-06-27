import {
  useCallback,
  useEffect,
  useMemo,
  useId,
  useRef,
  useReducer,
} from "react";
import proveedoresService from "@/services/proveedores.service";
import "./ProveedorSelect.css";

const normalizeProveedor = (proveedor) => ({
  id: String(proveedor.id),
  label:
    proveedor.nombre || proveedor.descripcion || `Proveedor ${proveedor.id}`,
  activo: proveedor.activo,
});

// ── Reducer — agrupa los 5 useState relacionados ──────────────
const initialState = {
  isOpen: false,
  proveedores: [],
  busqueda: "",
  cargando: false,
  error: "",
};

function reducer(state, action) {
  switch (action.type) {
    case "ABRIR":
      return { ...state, isOpen: !state.isOpen };
    case "CERRAR":
      return { ...state, isOpen: false };
    case "SET_BUSQUEDA":
      return { ...state, busqueda: action.payload };
    case "CARGANDO":
      return { ...state, cargando: true, error: "" };
    case "CARGA_OK":
      return { ...state, cargando: false, proveedores: action.payload };
    case "CARGA_ERROR":
      return { ...state, cargando: false, error: action.payload };
    case "LIMPIAR_BUSQUEDA":
      return { ...state, busqueda: "", isOpen: false };
    default:
      return state;
  }
}

const ProveedorSelect = ({
  value,
  onChange,
  disabled = false,
  placeholder = "— Buscar proveedor —",
}) => {
  const triggerId = useId();
  const listboxId = useId();
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const [{ isOpen, proveedores, busqueda, cargando, error }, dispatch] =
    useReducer(reducer, initialState);

  const cargarProveedores = useCallback(async () => {
    dispatch({ type: "CARGANDO" });
    try {
      const data = await proveedoresService.obtenerProveedores({
        activo: "true",
        take: 200,
      });
      dispatch({
        type: "CARGA_OK",
        payload: Array.isArray(data) ? data.map(normalizeProveedor) : [],
      });
    } catch (err) {
      dispatch({
        type: "CARGA_ERROR",
        payload: err?.message || "No fue posible cargar los proveedores.",
      });
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void cargarProveedores();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cargarProveedores]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        dispatch({ type: "CERRAR" });
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  // Enfocar el input de búsqueda al abrir — reemplaza autoFocus
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const selectedProveedor = useMemo(
    () => proveedores.find((p) => p.id === value),
    [proveedores, value],
  );

  const proveedoresFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return proveedores;
    return proveedores.filter((p) => p.label.toLowerCase().includes(termino));
  }, [busqueda, proveedores]);

  const handleAbrir = useCallback(() => {
    if (disabled) return;
    dispatch({ type: "ABRIR" });
  }, [disabled]);

  const handleSeleccionar = useCallback(
    (proveedorId) => {
      onChange(proveedorId);
      dispatch({ type: "LIMPIAR_BUSQUEDA" });
    },
    [onChange],
  );

  const handleLimpiar = useCallback(
    (event) => {
      event.stopPropagation();
      onChange("");
      dispatch({ type: "SET_BUSQUEDA", payload: "" });
    },
    [onChange],
  );

  // El onKeyDown va en el wrapper pero con role="combobox" para que sea semánticamente válido
  const handleTecla = useCallback(
    (event) => {
      if (event.key === "Escape") {
        dispatch({ type: "CERRAR" });
      }
      if (event.key === "Enter" && isOpen && proveedoresFiltrados[0]) {
        event.preventDefault();
        handleSeleccionar(proveedoresFiltrados[0].id);
      }
    },
    [handleSeleccionar, isOpen, proveedoresFiltrados],
  );

  return (
    <div className="proveedor-select" ref={wrapperRef} onKeyDown={handleTecla}>
      <button
        id={triggerId}
        className="proveedor-select__trigger"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={
          selectedProveedor
            ? `Proveedor: ${selectedProveedor.label}`
            : placeholder
        }
        onClick={handleAbrir}
      >
        <span className="proveedor-select__label">
          {selectedProveedor?.label || placeholder}
        </span>
        <span className="proveedor-select__meta">
          {selectedProveedor ? "Proveedor seleccionado" : "Buscar proveedor"}
        </span>
        <span
          className="material-symbols-outlined proveedor-select__icon"
          aria-hidden="true"
        >
          {isOpen ? "expand_less" : "expand_more"}
        </span>
      </button>

      {isOpen && (
        <div
          id={listboxId}
          className="proveedor-select__popover"
          role="listbox"
          aria-label="Lista de proveedores"
        >
          <div className="proveedor-select__search">
            <span className="material-symbols-outlined" aria-hidden="true">
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) =>
                dispatch({ type: "SET_BUSQUEDA", payload: e.target.value })
              }
              placeholder="Buscar por nombre..."
              aria-label="Buscar proveedor por nombre"
            />
            {selectedProveedor && (
              <button
                type="button"
                className="proveedor-select__clear"
                onClick={handleLimpiar}
                aria-label="Limpiar proveedor seleccionado"
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  close
                </span>
              </button>
            )}
          </div>

          {cargando && (
            <output className="proveedor-select__loading" aria-live="polite">
              <span
                className="proveedor-select__mini-spinner"
                aria-hidden="true"
              />
              Cargando proveedores...
            </output>
          )}

          {!cargando && error && (
            <output className="proveedor-select__error" aria-live="assertive">
              <span>{error}</span>
              <button type="button" onClick={cargarProveedores}>
                Reintentar
              </button>
            </output>
          )}

          {!cargando && !error && proveedoresFiltrados.length === 0 && (
            <output className="proveedor-select__empty" aria-live="polite">
              <span className="material-symbols-outlined" aria-hidden="true">
                inventory_2
              </span>
              {busqueda
                ? "No hay proveedores que coincidan."
                : "No hay proveedores activos."}
            </output>
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
                    proveedor.id === value
                      ? "proveedor-select__option--active"
                      : ""
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
