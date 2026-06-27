import { useState, useEffect, useMemo, useCallback } from "react";
import "./TablaGenerica.css";
import EstadoBadge from "@/components/common/EstadoBadge/EstadoBadge";

/**
 * TablaGenerica — Katepramax
 * Tabla reutilizable con buscador, paginación y soporte de acciones por fila.
 *
 * Props:
 *  columnas          Array<{ campo, label, tipo }>  — define las columnas
 *  datos             Array<object>                  — filas a mostrar
 *  filasPorPagina    number  (default 10)
 *  mostrarBuscador   boolean (default true)
 *  buscarEnCampos    Array<string>  — si vacío busca en todos los campos
 *  paginacion        boolean (default true)
 *  mostrarIndicadorFilas boolean (default true)
 *  renderAcciones    (fila) => Array<{ label, onClick, variante? }>
 *                    variante: "danger" | "success" | undefined
 */
const TablaGenerica = ({
  columnas,
  datos,
  filasPorPagina: filasPorPaginaInicial = 10,
  mostrarBuscador = true,
  buscarEnCampos = [],
  paginacion = true,
  mostrarIndicadorFilas = true,
  renderAcciones,
  renderCeldaCustom,
}) => {
  const [paginaActual, setPaginaActual] = useState(1);
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  // ← Bug corregido: filasPorPagina como estado local, no solo prop
  const [filasPorPagina, setFilasPorPagina] = useState(filasPorPaginaInicial);

  // ── Filtrado ──────────────────────────────────────────────
  const datosFiltrados = useMemo(() => {
    if (!terminoBusqueda.trim()) return datos;

    const termino = terminoBusqueda.toLowerCase().trim();
    const camposABuscar =
      buscarEnCampos.length > 0
        ? buscarEnCampos
        : columnas.map((col) => col.campo);

    return datos.filter((fila) =>
      camposABuscar.some(
        (campo) =>
          fila[campo] != null &&
          String(fila[campo]).toLowerCase().includes(termino),
      ),
    );
  }, [datos, terminoBusqueda, columnas, buscarEnCampos]);

  // ── Paginación ────────────────────────────────────────────
  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(datosFiltrados.length / filasPorPagina)),
    [datosFiltrados, filasPorPagina],
  );

  const paginaValida = useMemo(
    () => Math.min(paginaActual, totalPaginas),
    [paginaActual, totalPaginas],
  );

  const datosPagina = useMemo(() => {
    const inicio = (paginaValida - 1) * filasPorPagina;
    return datosFiltrados.slice(inicio, inicio + filasPorPagina);
  }, [datosFiltrados, paginaValida, filasPorPagina]);

  // ── Handlers ──────────────────────────────────────────────
  const manejarCambioPagina = useCallback((nueva) => {
    setPaginaActual(nueva);
  }, []);

  const manejarCambioBusqueda = useCallback((e) => {
    setTerminoBusqueda(e.target.value);
    setPaginaActual(1);
  }, []);

  const manejarCambioFilasPorPagina = useCallback((e) => {
    setFilasPorPagina(parseInt(e.target.value));
    setPaginaActual(1);
  }, []);

  // ── Render celda ──────────────────────────────────────────
  const renderCelda = (fila, col) => {
    if (renderCeldaCustom) {
      const custom = renderCeldaCustom(fila, col);
      if (custom !== null && custom !== undefined) return custom;
    }

    const valor = fila[col.campo];

    switch (col.tipo) {
      case "estado":
        return <EstadoBadge estado={valor} />;

      case "moneda":
        return valor != null
          ? new Intl.NumberFormat("es-CO", {
              style: "currency",
              currency: "COP",
              minimumFractionDigits: 0,
            }).format(valor)
          : "$0";

      case "fecha":
        return valor != null
          ? new Date(valor).toLocaleDateString("es-CO")
          : "—";

      case "booleano":
        return valor ? (
          <EstadoBadge estado="activo" />
        ) : (
          <EstadoBadge estado="inactivo" />
        );

      default: {
        const esReactElement =
          typeof valor === "object" &&
          valor !== null &&
          typeof valor.$$typeof === "symbol" &&
          valor.$$typeof === Symbol.for("react.element");

        if (esReactElement) return valor;
        return valor != null ? String(valor) : "—";
      }
    }
  };

  // ── Columnas con acciones ─────────────────────────────────
  const columnasFinales = renderAcciones
    ? [
        ...columnas,
        { campo: "__acciones", label: "Acciones", tipo: "acciones" },
      ]
    : columnas;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="tabla-contenedor">
      {/* Buscador */}
      {mostrarBuscador && (
        <div className="search-container">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Buscar..."
            value={terminoBusqueda}
            onChange={manejarCambioBusqueda}
            className="search-input"
          />
        </div>
      )}

      {/* Tabla */}
      <div className="table-responsive">
        <table className="generica-table">
          <thead>
            <tr>
              {columnasFinales.map((col) => (
                <th key={col.campo}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datosPagina.length > 0 ? (
              datosPagina.map((fila, idx) => (
                <tr key={fila.id ?? idx}>
                  {columnasFinales.map((col) => (
                    <td key={col.campo}>
                      {col.tipo === "acciones" ? (
                        <div className="tabla-acciones">
                          {renderAcciones(fila).map((accion, i) => (
                            <button
                              key={i}
                              onClick={accion.onClick}
                              className={`tabla-accion-btn ${
                                accion.variante === "danger"
                                  ? "tabla-accion-btn--danger"
                                  : accion.variante === "success"
                                    ? "tabla-accion-btn--success"
                                    : ""
                              }`}
                              type="button"
                            >
                              {accion.icon && (
                                <span className="material-symbols-outlined">
                                  {accion.icon}
                                </span>
                              )}
                              {accion.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        renderCelda(fila, col)
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columnasFinales.length} className="empty-state">
                  {terminoBusqueda
                    ? "No se encontraron resultados para la búsqueda."
                    : "No hay datos disponibles."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {paginacion && totalPaginas > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            Mostrando {datosPagina.length} de {datosFiltrados.length} registros
          </div>

          <div className="pagination-controls">
            <button
              onClick={() => manejarCambioPagina(1)}
              disabled={paginaValida === 1}
              className="pagination-btn"
            >
              «
            </button>
            <button
              onClick={() => manejarCambioPagina(paginaValida - 1)}
              disabled={paginaValida === 1}
              className="pagination-btn"
            >
              ‹ Anterior
            </button>
            <span className="pagination-current">
              {paginaValida} / {totalPaginas}
            </span>
            <button
              onClick={() => manejarCambioPagina(paginaValida + 1)}
              disabled={paginaValida === totalPaginas}
              className="pagination-btn"
            >
              Siguiente ›
            </button>
            <button
              onClick={() => manejarCambioPagina(totalPaginas)}
              disabled={paginaValida === totalPaginas}
              className="pagination-btn"
            >
              »
            </button>
          </div>

          {mostrarIndicadorFilas && (
            <div className="rows-per-page">
              <label htmlFor="filas-por-pagina">Mostrar:</label>
              <select
                id="filas-por-pagina"
                value={filasPorPagina}
                onChange={manejarCambioFilasPorPagina}
                className="rows-per-page-select"
              >
                {[5, 10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              filas
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TablaGenerica;
