import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import inventarioService from "@/services/inventario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import EstadoBadge from "@/components/common/EstadoBadge/EstadoBadge";
import { formatCOP } from "@/utils/formatters";
import "./ProductosPage.css";

// ─── Spinner ──────────────────────────────────────────────────
const Spinner = () => (
  <div className="prod-spinner-wrap">
    <div className="prod-spinner" />
    <span>Cargando productos...</span>
  </div>
);

// ─── Badge de stock bajo ──────────────────────────────────────
const StockBadge = ({ cantidad, stockMinimo }) => {
  const esBajo = cantidad <= stockMinimo;
  return esBajo ? (
    <span className="stock-badge stock-badge--bajo">
      <span className="material-symbols-outlined">warning</span>
      ¡Stock bajo!
    </span>
  ) : (
    <span className="stock-badge stock-badge--ok">{cantidad}</span>
  );
};

const ProductosPage = () => {
  const { esAdmin, esBodega, usuario } = useAuth();
  const puedeEditar = esAdmin || esBodega;
  const sedeIdUsuario = usuario?.sedeId ?? null;

  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroSede, setFiltroSede] = useState("");
  const [filtroDepto, setFiltroDepto] = useState("");
  const [filtroStockBajo, setFiltroStockBajo] = useState(false);

  // Modal Nuevo Producto
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalHistorial, setModalHistorial] = useState(false);
  const [productoSel, setProductoSel] = useState(null);

  // Formulario
  const [form, setForm] = useState({
    codigo: "",
    nombre: "",
    departamento: "",
    precioDetal: "",
    stockMinimo: "",
    sedeId: "",
    proveedorId: "",
  });
  const [guardando, setGuardando] = useState(false);

  // ── Carga de productos ─────────────────────────────────────
  const cargarProductos = useCallback(async () => {
    setCargando(true);
    try {
      const filtros = {};
      if (filtroSede && esAdmin) filtros.sedeId = filtroSede;
      if (filtroDepto) filtros.departamento = filtroDepto;
      if (filtroStockBajo) filtros.stockBajo = true;
      filtros.activo = "true";
      const data = await inventarioService.obtenerProductos(filtros);
      setProductos(data);
    } catch (err) {
      toast.error("Error al cargar productos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [filtroSede, filtroDepto, filtroStockBajo, esAdmin]);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  // ── Carga de movimientos para historial ───────────────────
  const cargarMovimientos = useCallback(async () => {
    try {
      const data = await inventarioService.listarMovimientos({});
      setMovimientos(data);
    } catch (err) {
      toast.error("Error al cargar movimientos: " + err.message);
    }
  }, []);

  // ── Filtrado local por búsqueda ────────────────────────────
  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productos;
    const termino = busqueda.toLowerCase().trim();
    return productos.filter((p) =>
      [p.codigo, p.nombre, p.departamento]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termino))
    );
  }, [productos, busqueda]);

  // ── Departamentos únicos ───────────────────────────────────
  const departamentos = useMemo(() => {
    const uniques = [...new Set(productos.map((p) => p.departamento).filter(Boolean))];
    return uniques.sort();
  }, [productos]);

  // ── Stats ───────────────────────────────────────────────────
  const totalProductos = productos.length;
  const productosStockBajo = productos.filter((p) => p.existencia <= p.stockMinimo).length;
  const valorInventario = productos.reduce(
    (sum, p) => sum + (parseFloat(p.precioDetal) || 0) * (p.existencia || 0),
    0
  );

  // ── Handlers formulario ───────────────────────────────────
  const handleCambioForm = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const abrirModalNuevo = () => {
    setForm({
      codigo: "",
      nombre: "",
      departamento: "",
      precioDetal: "",
      stockMinimo: "",
      sedeId: esAdmin ? "" : String(sedeIdUsuario),
      proveedorId: "",
    });
    setModalNuevo(true);
  };

  const abrirModalEditar = useCallback((prod) => {
    setProductoSel(prod);
    setForm({
      codigo: prod.codigo,
      nombre: prod.nombre || prod.descripcion || "",
      departamento: prod.departamento || "",
      precioDetal: prod.precioDetal || prod.precioVenta || "",
      stockMinimo: prod.stockMinimo || "",
      sedeId: prod.sedeId ? String(prod.sedeId) : "",
      proveedorId: prod.proveedorId ? String(prod.proveedorId) : "",
    });
    setModalEditar(true);
  }, []);

  const abrirHistorial = useCallback(async (prod) => {
    setProductoSel(prod);
    await cargarMovimientos();
    setModalHistorial(true);
  }, [cargarMovimientos]);

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await inventarioService.crearProducto(form);
      toast.success("Producto creado correctamente.");
      setModalNuevo(false);
      await cargarProductos();
    } catch (err) {
      toast.error("Error al crear producto: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleActualizar = async () => {
    setGuardando(true);
    try {
      await inventarioService.actualizarProducto(form.codigo, {
        nombre: form.nombre,
        departamento: form.departamento,
        precioDetal: parseFloat(form.precioDetal),
        stockMinimo: parseInt(form.stockMinimo),
        proveedorId: form.proveedorId ? parseInt(form.proveedorId) : null,
      });
      toast.success("Producto actualizado correctamente.");
      setModalEditar(false);
      await cargarProductos();
    } catch (err) {
      toast.error("Error al actualizar producto: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleDesactivar = useCallback(async (prod) => {
    if (!window.confirm(`¿Desactivar producto "${prod.nombre || prod.descripcion}"?`)) return;
    try {
      await inventarioService.desactivarProducto(prod.codigo);
      toast.success("Producto desactivado correctamente.");
      await cargarProductos();
    } catch (err) {
      toast.error("Error al desactivar: " + err.message);
    }
  }, [cargarProductos]);

  // ── Columnas tabla ───────────────────────────────────────
  const columnas = [
    { campo: "codigo", label: "Código", tipo: "texto" },
    { campo: "nombre", label: "Nombre", tipo: "texto" },
    { campo: "precioDetal", label: "Precio", tipo: "moneda" },
    { campo: "existencia", label: "Existencia", tipo: "texto" },
    { campo: "departamento", label: "Departamento", tipo: "texto" },
    { campo: "proveedor", label: "Proveedor", tipo: "texto" },
    { campo: "sede", label: "Sede", tipo: "texto" },
    { campo: "activo", label: "Estado", tipo: "booleano" },
  ];

  const acciones = useCallback(
    (prod) => [
      { label: "Editar", icon: "edit", onClick: () => abrirModalEditar(prod) },
      { label: "Historial", icon: "history", onClick: () => abrirHistorial(prod) },
      ...(puedeEditar
        ? [
            {
              label: prod.activo ? "Desactivar" : "Activar",
              icon: prod.activo ? "delete" : "restore_from_trash",
              onClick: () => handleDesactivar(prod),
              variante: prod.activo ? "danger" : "success",
            },
          ]
        : []),
    ],
    [puedeEditar, abrirModalEditar, abrirHistorial, handleDesactivar]
  );

  // Mapeados para tabla
  const datosTabla = useMemo(
    () =>
      productosFiltrados.map((p) => ({
        ...p,
        nombre: p.nombre || p.descripcion,
        precioDetal: p.precioDetal || p.precioVenta,
        proveedor: p.proveedor?.nombre || p.proveedor || "—",
        sede: p.sede?.nombre || p.sede || `Sede ${p.sedeId}`,
        existencia: (
          <StockBadge
            cantidad={p.existencia || 0}
            stockMinimo={p.stockMinimo || 0}
          />
        ),
      })),
    [productosFiltrados]
  );

  // Movimientos del producto seleccionado
  const movimientosProducto = useMemo(
    () => movimientos.filter((m) => m.productoId === productoSel?.id),
    [movimientos, productoSel]
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="productos-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Catálogo de Productos</h1>
          <p className="productos-subtitulo">
            Gestión completa de productos, precios y stock
          </p>
        </div>

        {/* Alerta stock bajo destacada */}
        {productosStockBajo > 0 && (
          <div className="stock-alerta">
            <span className="stock-alerta__icon">
              <span className="material-symbols-outlined">warning</span>
            </span>
            <span className="stock-alerta__text">
              {productosStockBajo} producto{productosStockBajo > 1 ? "s" : ""} con stock bajo
            </span>
            <button
              className="stock-alerta__btn"
              onClick={() => setFiltroStockBajo(true)}
              type="button"
            >
              Ver alertas
            </button>
          </div>
        )}

        <div className="filters">
          {esAdmin && (
            <div className="filter-group">
              <label htmlFor="filtro-sede">Sede</label>
              <select
                id="filtro-sede"
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                className="filter-select"
              >
                <option value="">Todas</option>
                <option value="1">Bogotá</option>
                <option value="2">Cartagena</option>
                <option value="3">Villavicencio</option>
              </select>
            </div>
          )}

          <div className="filter-group">
            <label htmlFor="filtro-depto">Departamento</label>
            <select
              id="filtro-depto"
              value={filtroDepto}
              onChange={(e) => setFiltroDepto(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos</option>
              {departamentos.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group filter-group--checkbox">
            <label className="checkbox-label" htmlFor="filtro-stock-bajo">
              <input
                type="checkbox"
                id="filtro-stock-bajo"
                checked={filtroStockBajo}
                onChange={(e) => setFiltroStockBajo(e.target.checked)}
              />
              <span className="checkbox-text">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  warning
                </span>
                Solo stock bajo
              </span>
            </label>
          </div>

          {puedeEditar && (
            <button className="btn-primary" onClick={abrirModalNuevo} type="button">
              <span className="material-symbols-outlined">add</span>
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Stats del catálogo */}
      <div className="prod-stats">
        <div className="prod-stat-card prod-stat-card--total">
          <span className="material-symbols-outlined">inventory_2</span>
          <div>
            <span className="prod-stat-valor">{totalProductos}</span>
            <span className="prod-stat-label">Total Productos</span>
          </div>
        </div>
        <div className="prod-stat-card prod-stat-card--danger">
          <span className="material-symbols-outlined">warning</span>
          <div>
            <span className="prod-stat-valor">{productosStockBajo}</span>
            <span className="prod-stat-label">Stock Bajo</span>
          </div>
        </div>
        <div className="prod-stat-card prod-stat-card--gold">
          <span className="material-symbols-outlined">attach_money</span>
          <div>
            <span className="prod-stat-valor">{formatCOP(valorInventario)}</span>
            <span className="prod-stat-label">Valor Inventario</span>
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
            datos={datosTabla}
            filasPorPagina={15}
            mostrarBuscador
            buscarEnCampos={["codigo", "nombre"]}
            paginacion
            renderAcciones={acciones}
          />
        )}
      </div>

      {/* Modal — Nuevo Producto */}
      <Modal
        isOpen={modalNuevo}
        onClose={() => setModalNuevo(false)}
        titulo="Nuevo Producto"
        textoBotonConfirmar={guardando ? "Guardando..." : "Crear Producto"}
        onConfirmar={handleGuardar}
        mostrarCancelar
        disabled={guardando}
      >
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="prod-codigo">Código *</label>
            <input
              id="prod-codigo"
              name="codigo"
              type="text"
              value={form.codigo}
              onChange={handleCambioForm}
              className="form-control"
              placeholder="PROD-XXX"
            />
          </div>

          <div className="form-group">
            <label htmlFor="prod-nombre">Nombre *</label>
            <input
              id="prod-nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleCambioForm}
              className="form-control"
              placeholder="Nombre del producto"
            />
          </div>

          <div className="form-group">
            <label htmlFor="prod-depto">Departamento *</label>
            <select
              id="prod-depto"
              name="departamento"
              value={form.departamento}
              onChange={handleCambioForm}
              className="form-control"
            >
              <option value="">— Selecciona —</option>
              <option value="Abastecimiento">Abastecimiento</option>
              <option value="Lácteos">Lácteos</option>
              <option value="Abarrotes">Abarrotes</option>
              <option value="Congelados">Congelados</option>
              <option value="Limpieza">Limpieza</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="prod-precio">Precio Detal *</label>
              <input
                id="prod-precio"
                name="precioDetal"
                type="number"
                value={form.precioDetal}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="prod-stock">Stock Mínimo *</label>
              <input
                id="prod-stock"
                name="stockMinimo"
                type="number"
                value={form.stockMinimo}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="1"
                placeholder="0"
              />
            </div>
          </div>

          {esAdmin && (
            <div className="form-group">
              <label htmlFor="prod-sede">Sede *</label>
              <select
                id="prod-sede"
                name="sedeId"
                value={form.sedeId}
                onChange={handleCambioForm}
                className="form-control"
              >
                <option value="">— Selecciona —</option>
                <option value="1">Bogotá</option>
                <option value="2">Cartagena</option>
                <option value="3">Villavicencio</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="prod-proveedor">Proveedor (Opcional)</label>
            <input
              id="prod-proveedor"
              name="proveedorId"
              type="text"
              value={form.proveedorId}
              onChange={handleCambioForm}
              className="form-control"
              placeholder="ID del proveedor"
            />
          </div>
        </div>
      </Modal>

      {/* Modal — Editar Producto */}
      <Modal
        isOpen={modalEditar}
        onClose={() => setModalEditar(false)}
        titulo="Editar Producto"
        textoBotonConfirmar={guardando ? "Actualizando..." : "Actualizar"}
        onConfirmar={handleActualizar}
        mostrarCancelar
        disabled={guardando}
      >
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="edit-codigo">Código</label>
            <input
              id="edit-codigo"
              name="codigo"
              type="text"
              value={form.codigo}
              className="form-control"
              readOnly
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-nombre">Nombre *</label>
            <input
              id="edit-nombre"
              name="nombre"
              type="text"
              value={form.nombre}
              onChange={handleCambioForm}
              className="form-control"
              placeholder="Nombre del producto"
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-depto">Departamento *</label>
            <select
              id="edit-depto"
              name="departamento"
              value={form.departamento}
              onChange={handleCambioForm}
              className="form-control"
            >
              <option value="">— Selecciona —</option>
              <option value="Abastecimiento">Abastecimiento</option>
              <option value="Lácteos">Lácteos</option>
              <option value="Abarrotes">Abarrotes</option>
              <option value="Congelados">Congelados</option>
              <option value="Limpieza">Limpieza</option>
              <option value="Otros">Otros</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="edit-precio">Precio Detal *</label>
              <input
                id="edit-precio"
                name="precioDetal"
                type="number"
                value={form.precioDetal}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="100"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-stock">Stock Mínimo *</label>
              <input
                id="edit-stock"
                name="stockMinimo"
                type="number"
                value={form.stockMinimo}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="1"
                placeholder="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="edit-proveedor">Proveedor</label>
            <input
              id="edit-proveedor"
              name="proveedorId"
              type="text"
              value={form.proveedorId}
              onChange={handleCambioForm}
              className="form-control"
              placeholder="ID del proveedor"
            />
          </div>
        </div>
      </Modal>

      {/* Modal — Historial del Producto */}
      <Modal
        isOpen={modalHistorial}
        onClose={() => setModalHistorial(false)}
        titulo={`Historial: ${productoSel?.nombre || productoSel?.descripcion}`}
        mostrarCancelar={false}
        textoBotonConfirmar="Cerrar"
        onConfirmar={() => setModalHistorial(false)}
      >
        {productoSel && (
          <div className="historial-producto">
            <div className="historial-header">
              <span className="historial-codigo">{productoSel.codigo}</span>
              <EstadoBadge estado={productoSel.activo ? "activo" : "inactivo"} />
            </div>

            <div className="historial-stats">
              <div className="historial-stat">
                <span>Stock actual</span>
                <strong>{productoSel.existencia || 0}</strong>
              </div>
              <div className="historial-stat">
                <span>Mínimo</span>
                <strong>{productoSel.stockMinimo || 0}</strong>
              </div>
            </div>

            {movimientosProducto.length > 0 ? (
              <TablaGenerica
                columnas={[
                  { campo: "fecha", label: "Fecha", tipo: "fecha" },
                  { campo: "tipo", label: "Tipo", tipo: "estado" },
                  { campo: "cantidad", label: "Cantidad", tipo: "texto" },
                  { campo: "nota", label: "Nota", tipo: "texto" },
                ]}
                datos={movimientosProducto.map((m) => ({
                  ...m,
                  tipo: m.tipo,
                }))}
                filasPorPagina={10}
                mostrarBuscador={false}
                paginacion={false}
              />
            ) : (
              <div className="historial-empty">
                <span className="material-symbols-outlined">history</span>
                <span>No hay movimientos registrados para este producto.</span>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductosPage;