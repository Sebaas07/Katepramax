import { useState, useMemo, useCallback } from "react";
import "./TablaGenerica.css";
import EstadoBadge from "@/components/common/EstadoBadge/EstadoBadge";

const TablaGenerica = ({
  columnas,           // Array de objetos con { campo, label, tipo }
  datos,              // Array de objetos con los datos
  filasPorPagina = 10, // Número de filas por página
  mostrarBuscador = true, // Mostrar/ocultar buscador
  buscarEnCampos = [],   // Campos en los que buscar (si vacío, busca en todos)
  paginacion = true,     // Mostrar/ocultar paginacion
  mostrarIndicadorFilas = true // Mostrar indicador de filas mostradas
}) => {
  // Estado para paginación y búsqueda
  const [paginaActual, setPaginaActual] = useState(1);
  const [terminoBusqueda, setTerminoBusqueda] = useState("");

  // Filtrar datos según término de búsqueda
  const datosFiltrados = useMemo(() => {
    if (!terminoBusqueda.trim()) return datos;

    const termino = terminoBusqueda.toLowerCase().trim();
    
    // Si no se especifican campos para buscar, buscar en todos
    const camposABuscar = buscarEnCampos.length > 0 
      ? buscarEnCampos 
      : columnas.map(col => col.campo);

    return datos.filter(fila => 
      camposABuscar.some(campo => 
        fila[campo] != null && 
        String(fila[campo]).toLowerCase().includes(termino)
      )
    );
  }, [datos, terminoBusqueda, columnas, buscarEnCampos]);

  // Calcular total de páginas
  const totalPaginas = useMemo(() => {
    return Math.max(1, Math.ceil(datosFiltrados.length / filasPorPagina));
  }, [datosFiltrados, filasPorPagina]);

  // Asegurar que la página actual sea válida
  const paginaValida = useMemo(() => {
    return Math.min(paginaActual, totalPaginas);
  }, [paginaActual, totalPaginas]);

  // Obtener datos para la página actual
  const datosPagina = useMemo(() => {
    const indiceInicio = (paginaValida - 1) * filasPorPagina;
    const indiceFin = indiceInicio + filasPorPagina;
    return datosFiltrados.slice(indiceInicio, indiceFin);
  }, [datosFiltrados, paginaValida, filasPorPagina]);

  // Funciones de manejo
  const manejarCambioPagina = useCallback((nuevaPagina) => {
    setPaginaActual(nuevaPagina);
  }, []);

  const manejarCambioBusqueda = useCallback((e) => {
    setTerminoBusqueda(e.target.value);
    setPaginaActual(1); // Resetear a primera página al buscar
  }, []);

  const manejarCambioFilasPorPagina = useCallback((e) => {
    const nuevasFilas = parseInt(e.target.value);
    setFilasPorPagina(nuevasFilas);
    setPaginaActual(1); // Resetear a primera página al cambiar filas por página
  }, []);

  // Renderizar encabezado de tabla
  const renderEncabezado = () => (
    <thead>
      <tr>
        {columnas.map((col) => (
          <th key={col.campo} className={`th-${col.campo}`}>
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );

  // Renderizar cuerpo de tabla
  const renderCuerpo = () => (
    <tbody>
      {datosPagina.length > 0 ? (
        datosPagina.map((fila, indice) => (
          <tr key={`${fila.id || indice}-${indice}`} className="hover-row">
            {columnas.map((col) => {
              let valor = fila[col.campo];
              
              // Manejar tipos especiales
              switch (col.tipo) {
                case "estado":
                  valor = <EstadoBadge estado={valor} />;
                  break;
                case "moneda":
                  valor = valor != null ? new Intl.NumberFormat("es-CO", {
                    style: "currency",
                    currency: "COP",
                    minimumFractionDigits: 0
                  }).format(valor) : "$0";
                  break;
                case "fecha":
                  valor = valor != null ? new Date(valor).toLocaleDateString("es-CO") : "";
                  break;
                case "acciones":
                  // Este tipo se maneja differently - se asume que ya viene como JSX
                  break;
                default:
                  // Valor por defecto
                  valor = valor != null ? valor : "";
              }
              
              return (
                <td key={col.campo} className={`td-${col.campo}`}>
                  {valor}
                </td>
              );
            })}
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={columnas.length} className="empty-state">
            No se encontraron resultados
          </td>
        </tr>
      )}
    </tbody>
  );

  // Renderizar paginación
  const renderPaginacion = () => {
    if (!paginacion || totalPaginas <= 1) return null;

    return (
      <div className="pagination-container">
        <div className="pagination-info">
          Mostrando {datosPagina.length} de {datosFiltrados.length} entradas
        </div>
        <div className="pagination-controls">
          <button
            onClick={() => manejarCambioPagina(1)}
            disabled={paginaValida === 1}
            className="pagination-btn"
          >
            « Primera
          </button>
          <button
            onClick={() => manejarCambioPagina(paginaValida - 1)}
            disabled={paginaValida === 1}
            className="pagination-btn"
          >
            ‹ Anterior
          </button>
          <span className="pagination-current">
            Página {paginaValida} de {totalPaginas}
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
            Última »
          </button>
        </div>
        {mostrarIndicadorFilas && (
          <div className="rows-per-page">
            <label htmlFor="filas-por-pagina">
              Mostrar:
            </label>
            <select
              id="filas-por-pagina"
              value={filasPorPagina}
              onChange={manejarCambioFilasPorPagina}
              className="rows-per-page-select"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            filas
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="tabla-contenedor">
      {mostrarBuscador && (
        <div className="search-container">
          <input
            type="text"
            placeholder="Buscar..."
            value={terminoBusqueda}
            onChange={manejarCambioBusqueda}
            className="search-input"
          />
          <span className="material-symbols-outlined search-icon">
            search
          </span>
        </div>
      )}
      
      <div className="table-responsive">
        <table className="generica-table">
          {renderEncabezado()}
          {renderCuerpo()}
        </table>
      </div>
      
      {renderPaginacion()}
    </div>
  );
};

export default TablaGenerica;