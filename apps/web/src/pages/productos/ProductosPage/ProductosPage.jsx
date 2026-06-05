import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import inventarioService from "@/services/inventario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import { formatCOP } from "@/utils/formatters";
import "./ProductosPage.css";

// ─── Spinner ──────────────────────────────────────────────────
const Spinner = () => (
  <div className="prod-spinner-wrap">
    <div className="prod-spinner" />
    <span>Cargando productos...</span>
  </div>
);

// ─── Badge de rentabilidad ─────────────────────────────────────
const BadgeRentabilidad = ({ porcentaje }) => {
  const valor = parseFloat(porcentaje) || 0;
  const cls =
    valor >= 30 ? "rent-alta" :
    valor >= 15 ? "rent-media" :
    "rent-baja";
  return (
    <span className={`rent-badge rent-badge--${cls}`}>
      {valor.toFixed(1)}%
    </span>
  );
};

const ProductosPage = () => {
  const { esAdmin, esBodega } = useAuth();

  const [productos,    setProductos]    = useState([]);
  const [cargando,     setCargando]     = useState(false);
  const [busqueda,     setBusqueda]     = useState("");
  const [filtroActivo, setFiltroActivo] = useState("true");
  const [modalDetalle, setModalDetalle] = useState(false);
  const [productoSel,  setProductoSel]  = useState(null);

  // ── Carga ─────────────────────────────────────────────────
  const cargarProductos = useCallback(async () => {
    setCargando(true);
    try {
      const filtros = {};
      if (filtroActivo !== "") filtros.activo = filtroActivo;
      const data = await inventarioService.obtenerProductos(filtros);
      setProductos(data);
    } catch (err) {
      toast.error("Error al cargar productos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [filtroActivo]);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  // ── Filtrado local por búsqueda ────────────────────────────
  const productosFiltrados = busqueda.trim()
    ? productos.filter((p) =>
        [p.codigo, p.descripcion, p.departamento]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(busqueda.toLowerCase()))
      )
    : productos;

  // ── Stats del catálogo ─────────────────────────────────────
  const totalActivos   = productos.filter((p) => p.activo).length;
  const totalInactivos = productos.filter((p) => !p.activo).length;
  const rentPromedio   = productos.length
    ? (productos.reduce((s, p) => s + (parseFloat(p.porcentajeGanancia) || 0), 0) / productos.length).toFixed(1)
    : 0;

  // ── Ver detalle ────────────────────────────────────────────
  const verDetalle = (prod) => {
    setProductoSel(prod);
    setModalDetalle(true);
  };

  // ── Columnas ───────────────────────────────────────────────
  const columnas = [
    { campo: "codigo",             label: "Código",     tipo: "texto"  },
    { campo: "descripcion",        label: "Producto",   tipo: "texto"  },
    { campo: "precioCosto",        label: "Costo",      tipo: "moneda" },
    { campo: "precioVenta",        label: "Venta",      tipo: "moneda" },
    { campo: "precioMayoreo",      label: "Mayoreo",    tipo: "moneda" },
    { campo: "porcentajeGanancia", label: "% Gan.",     tipo: "texto"  },
    { campo: "activo",             label: "Estado",     tipo: "booleano" },
  ];

  const acciones = (prod) => [
    { label: "Ver detalle", icon: "visibility", onClick: () => verDetalle(prod) },
  ];

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="productos-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Catálogo de Productos</h1>
          <p className="productos-subtitulo">
            Precios, costos y márgenes de rentabilidad
          </p>
        </div>
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="prod-filtro-activo">Estado</label>
            <select
              id="prod-filtro-activo"
              value={filtroActivo}
              onChange={(e) => setFiltroActivo(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats del catálogo */}
      <div className="prod-stats">
        <div className="prod-stat-card">
          <span className="material-symbols-outlined">inventory_2</span>
          <div>
            <span className="prod-stat-valor">{totalActivos}</span>
            <span className="prod-stat-label">Activos</span>
          </div>
        </div>
        <div className="prod-stat-card prod-stat-card--dim">
          <span className="material-symbols-outlined">hide_source</span>
          <div>
            <span className="prod-stat-valor">{totalInactivos}</span>
            <span className="prod-stat-label">Inactivos</span>
          </div>
        </div>
        <div className="prod-stat-card prod-stat-card--gold">
          <span className="material-symbols-outlined">trending_up</span>
          <div>
            <span className="prod-stat-valor">{rentPromedio}%</span>
            <span className="prod-stat-label">Rentabilidad prom.</span>
          </div>
        </div>
        <div className="prod-stat-card prod-stat-card--total">
          <span className="material-symbols-outlined">category</span>
          <div>
            <span className="prod-stat-valor">{productos.length}</span>
            <span className="prod-stat-label">Total productos</span>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={productosFiltrados.map((p) => ({
              ...p,
              porcentajeGanancia: p.porcentajeGanancia
                ? `${parseFloat(p.porcentajeGanancia).toFixed(1)}%`
                : "—",
            }))}
            filasPorPagina={15}
            mostrarBuscador
            buscarEnCampos={["codigo", "descripcion"]}
            paginacion
            renderAcciones={acciones}
          />
        )}
      </div>

      {/* Modal detalle */}
      <Modal
        isOpen={modalDetalle}
        onClose={() => setModalDetalle(false)}
        titulo="Detalle del Producto"
        mostrarCancelar={false}
        textoBotonConfirmar="Cerrar"
        onConfirmar={() => setModalDetalle(false)}
      >
        {productoSel && (
          <div className="prod-detalle">
            {/* Header del producto */}
            <div className="prod-detalle__header">
              <div className="prod-detalle__codigo">{productoSel.codigo}</div>
              <span className={`prod-detalle__estado ${productoSel.activo ? "activo" : "inactivo"}`}>
                {productoSel.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
            <h3 className="prod-detalle__nombre">{productoSel.descripcion}</h3>

            {/* Grid de precios */}
            <div className="prod-detalle__grid">
              <div className="prod-precio-card prod-precio-card--costo">
                <span className="prod-precio-card__label">Costo</span>
                <span className="prod-precio-card__valor">
                  {formatCOP(productoSel.precioCosto)}
                </span>
              </div>
              <div className="prod-precio-card prod-precio-card--venta">
                <span className="prod-precio-card__label">Precio Venta</span>
                <span className="prod-precio-card__valor">
                  {formatCOP(productoSel.precioVenta)}
                </span>
              </div>
              <div className="prod-precio-card prod-precio-card--mayoreo">
                <span className="prod-precio-card__label">Mayoreo</span>
                <span className="prod-precio-card__valor">
                  {formatCOP(productoSel.precioMayoreo)}
                </span>
              </div>
              <div className="prod-precio-card prod-precio-card--ganancia">
                <span className="prod-precio-card__label">Rentabilidad</span>
                <span className="prod-precio-card__valor">
                  <BadgeRentabilidad porcentaje={productoSel.porcentajeGanancia} />
                </span>
              </div>
            </div>

            {/* Info adicional */}
            {(productoSel.departamento || productoSel.proveedor) && (
              <div className="prod-detalle__extra">
                {productoSel.departamento && (
                  <div className="prod-detalle__campo">
                    <span className="material-symbols-outlined">label</span>
                    <span>Departamento: <strong>{productoSel.departamento}</strong></span>
                  </div>
                )}
                {productoSel.proveedor && (
                  <div className="prod-detalle__campo">
                    <span className="material-symbols-outlined">conveyor_belt</span>
                    <span>Proveedor: <strong>{productoSel.proveedor?.nombre ?? productoSel.proveedor}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductosPage;
