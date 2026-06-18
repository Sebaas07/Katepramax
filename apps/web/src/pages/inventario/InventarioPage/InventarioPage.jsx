import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import inventarioService from "@/services/inventario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./InventarioPage.css";

const HOY = new Date().toISOString().split("T")[0];

// ─── Spinner ──────────────────────────────────────────────────
const Spinner = () => (
  <div className="inv-spinner-wrap">
    <div className="inv-spinner" />
    <span>Cargando...</span>
  </div>
);

// ─── Tabs del inventario ───────────────────────────────────────
const TABS = [
  { key: "productos", label: "Productos", icon: "category" },
  { key: "entradas", label: "Entradas", icon: "move_to_inbox" },
  { key: "movimientos", label: "Movimientos", icon: "swap_horiz" },
];

const InventarioPage = () => {
  const { usuario, esAdmin, esBodega } = useAuth();
  const puedeRegistrar = esAdmin || esBodega;
  const sedeIdUsuario = usuario?.sedeId ?? null;

  const [activeTab, setActiveTab] = useState("productos");
  const [productos, setProductos] = useState([]);
  const [entradas, setEntradas] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardandoMov, setGuardandoMov] = useState(false);
  const [modalMovAbierto, setModalMovAbierto] = useState(false);

  // Formulario movimiento
  const [form, setForm] = useState({
    tipo: "entrada",
    productoId: "",
    cantidad: "",
    nota: "",
    sedeId: "",
    fecha: HOY,
  });

  // Filtros movimientos
  const [filtrosMov, setFiltrosMov] = useState({
    sedeId: "",
    productoId: "",
    tipo: "",
  });

  // ── Carga de datos ───────────────────────────────────────────
  const cargarProductos = useCallback(async () => {
    setCargando(true);
    try {
      const data = await inventarioService.obtenerProductos({ activo: "true" });
      setProductos(data);
    } catch (err) {
      toast.error("Error al cargar productos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  const cargarMovimientos = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtrosMov.sedeId && esAdmin) params.sedeId = parseInt(filtrosMov.sedeId);
      if (filtrosMov.productoId) params.productoId = filtrosMov.productoId;
      if (filtrosMov.tipo) params.tipo = filtrosMov.tipo;
      const data = await inventarioService.listarMovimientos(params);
      setMovimientos(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Error al cargar movimientos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [filtrosMov.sedeId, filtrosMov.productoId, filtrosMov.tipo, esAdmin]);

  const cargarEntradas = useCallback(async () => {
    setCargando(true);
    try {
      const data = await inventarioService.listarEntradas({});
      setEntradas(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Error al cargar entradas: " + err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (activeTab === "productos") void cargarProductos();
      if (activeTab === "movimientos") void cargarMovimientos();
      if (activeTab === "entradas") void cargarEntradas();
    }, 0);

    return () => window.clearTimeout(id);
  }, [activeTab, cargarProductos, cargarMovimientos, cargarEntradas]);

  // ── Handlers formulario ──────────────────────────────────────
  const handleCambioForm = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const abrirModalMovimiento = () => {
    setForm({
      tipo: "entrada",
      productoId: "",
      cantidad: "",
      nota: "",
      sedeId: esAdmin ? "" : String(sedeIdUsuario),
      fecha: HOY,
    });
    setModalMovAbierto(true);
  };

  const handleGuardarMovimiento = async () => {
    setGuardandoMov(true);
    try {
      await inventarioService.registrarMovimiento({
        tipo: form.tipo,
        productoId: form.productoId,
        cantidad: parseInt(form.cantidad),
        nota: form.nota,
        sedeId: form.sedeId,
        fecha: form.fecha,
      });
      toast.success("Movimiento registrado correctamente.");
      window.dispatchEvent(new Event("katepramax:inventario-actualizado"));
      setModalMovAbierto(false);
      if (activeTab === "movimientos") await cargarMovimientos();
      if (activeTab === "productos") await cargarProductos();
      if (activeTab === "entradas") await cargarEntradas();
    } catch (err) {
      toast.error("Error al registrar: " + err.message);
    } finally {
      setGuardandoMov(false);
    }
  };

  // ── Columnas ───────────────────────────────────────────────────
  const columnasProductos = [
    { campo: "codigo", label: "Código", tipo: "texto" },
    { campo: "nombre", label: "Nombre", tipo: "texto" },
    { campo: "precioDetal", label: "Precio", tipo: "moneda" },
    { campo: "existencia", label: "Existencia", tipo: "texto" },
    { campo: "departamento", label: "Departamento", tipo: "texto" },
    { campo: "sede", label: "Sede", tipo: "texto" },
    { campo: "activo", label: "Estado", tipo: "booleano" },
  ];

  const columnasMovimientos = [
    { campo: "fecha", label: "Fecha", tipo: "fecha" },
    { campo: "producto", label: "Producto", tipo: "texto" },
    { campo: "tipo", label: "Tipo", tipo: "estado" },
    { campo: "cantidad", label: "Cantidad", tipo: "texto" },
    { campo: "nota", label: "Nota", tipo: "texto" },
    { campo: "sede", label: "Sede", tipo: "texto" },
  ];

  // Mapear datos movimientos
  const movimientosMapeados = useMemo(
    () =>
      movimientos.map((m) => ({
        ...m,
        producto: m.producto?.nombre || m.productoNombre || m.productoId,
        sede: m.sede?.nombre || `Sede ${m.sedeId}`,
      })),
    [movimientos]
  );

  // Stats stock bajo
  const stockBajoCount = productos.filter(
    (p) => p.existencia <= p.stockMinimo
  ).length;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="inventario-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Gestión de Inventario</h1>
          <p className="inv-subtitulo">
            Control de stock, entradas y movimientos de productos
          </p>
        </div>
        <div className="inv-header-acciones">
          {/* Tabs */}
          <div className="tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={activeTab === tab.key ? "tab-active" : "tab-btn"}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                <span className="material-symbols-outlined">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Botón registrar movimiento */}
          {puedeRegistrar && (
            <button className="btn-primary" onClick={abrirModalMovimiento} type="button">
              <span className="material-symbols-outlined">add</span>
              Nuevo Movimiento
            </button>
          )}
        </div>
      </div>

      {/* Alertas stock bajo */}
      {stockBajoCount > 0 && (
        <div className="inv-alertas">
          <div className="inv-alerta-stock">
            <span className="material-symbols-outlined">warning</span>
            <span>
              <strong>{stockBajoCount} productos</strong> con stock bajo requieren atención
            </span>
          </div>
        </div>
      )}

      {/* Contenido según tab */}
      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : (
          <>
            {activeTab === "productos" && (
              <>
                <div className="page-actions">
                  <h2>
                    <span className="material-symbols-outlined">category</span>
                    Catálogo de Productos
                  </h2>
                  <span className="inv-contador">{productos.length} productos</span>
                </div>
                <TablaGenerica
                  columnas={columnasProductos}
                  datos={productos.map((p) => ({
                    ...p,
                    nombre: p.nombre || p.descripcion,
                    sede: p.sede?.nombre || `Sede ${p.sedeId}`,
                  }))}
                  filasPorPagina={15}
                  mostrarBuscador
                  buscarEnCampos={["codigo", "nombre"]}
                  paginacion
                />
              </>
            )}

            {activeTab === "movimientos" && (
              <>
                {/* Filtros de movimientos */}
                <div className="inv-filtros">
                  {esAdmin && (
                    <div className="filter-group">
                      <label htmlFor="mov-filtro-sede">Sede</label>
                      <select
                        id="mov-filtro-sede"
                        value={filtrosMov.sedeId}
                        onChange={(e) =>
                          setFiltrosMov((p) => ({ ...p, sedeId: e.target.value }))
                        }
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
                    <label htmlFor="mov-filtro-tipo">Tipo</label>
                    <select
                      id="mov-filtro-tipo"
                      value={filtrosMov.tipo}
                      onChange={(e) =>
                        setFiltrosMov((p) => ({ ...p, tipo: e.target.value }))
                      }
                      className="filter-select"
                    >
                      <option value="">Todos</option>
                      <option value="entrada">Entrada</option>
                      <option value="salida">Salida</option>
                      <option value="ajuste">Ajuste</option>
                    </select>
                  </div>
                </div>

                <div className="page-actions">
                  <h2>
                    <span className="material-symbols-outlined">swap_horiz</span>
                    Movimientos de Inventario
                  </h2>
                  <span className="inv-contador">{movimientos.length} registros</span>
                </div>
                <TablaGenerica
                  columnas={columnasMovimientos}
                  datos={movimientosMapeados}
                  filasPorPagina={15}
                  mostrarBuscador
                  buscarEnCampos={["producto", "nota"]}
                  paginacion
                />
              </>
            )}

            {activeTab === "entradas" && (
              <>
                <div className="page-actions">
                  <h2>
                    <span className="material-symbols-outlined">move_to_inbox</span>
                    Entradas de Inventario
                  </h2>
                </div>
                <TablaGenerica
                  columnas={[
                    { campo: "fecha", label: "Fecha", tipo: "fecha" },
                    { campo: "producto", label: "Producto", tipo: "texto" },
                    { campo: "sede", label: "Sede", tipo: "texto" },
                    { campo: "cantidad", label: "Cantidad", tipo: "texto" },
                    { campo: "costo", label: "Costo", tipo: "moneda" },
                  ]}
                  datos={entradas.map((e) => ({
                    ...e,
                    producto: e.producto?.descripcion || e.productoId,
                    sede: e.sede?.nombre || `Sede ${e.sedeId}`,
                  }))}
                  filasPorPagina={15}
                  mostrarBuscador
                  buscarEnCampos={["producto"]}
                  paginacion
                />
              </>
            )}
          </>
        )}
      </div>

      {/* Modal — Nuevo Movimiento */}
      <Modal
        isOpen={modalMovAbierto}
        onClose={() => setModalMovAbierto(false)}
        titulo="Registrar Movimiento"
        textoBotonConfirmar={guardandoMov ? "Registrando..." : "Registrar"}
        onConfirmar={handleGuardarMovimiento}
        mostrarCancelar
        disabled={guardandoMov}
      >
        <div className="modal-form">
          {/* Tipo de movimiento */}
          <div className="form-group">
            <label htmlFor="mov-tipo">Tipo *</label>
            <select
              id="mov-tipo"
              name="tipo"
              value={form.tipo}
              onChange={handleCambioForm}
              className="form-control"
            >
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste (+/-)</option>
            </select>
          </div>

          {/* Producto */}
          <div className="form-group">
            <label htmlFor="mov-producto">Producto *</label>
            <select
              id="mov-producto"
              name="productoId"
              value={form.productoId}
              onChange={handleCambioForm}
              className="form-control"
            >
              <option value="">— Selecciona un producto —</option>
              {productos.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  [{p.codigo}] {p.nombre || p.descripcion}
                </option>
              ))}
            </select>
          </div>

          {/* Cantidad */}
          <div className="form-group">
            <label htmlFor="mov-cantidad">
              {form.tipo === "ajuste" ? "Ajuste (número)" : "Cantidad *"}
            </label>
            <input
              id="mov-cantidad"
              name="cantidad"
              type="number"
              value={form.cantidad}
              onChange={handleCambioForm}
              className="form-control"
              min={form.tipo === "ajuste" ? undefined : "1"}
              step="1"
              placeholder={form.tipo === "ajuste" ? "-10 o +20" : "0"}
            />
          </div>

          {/* Fecha */}
          <div className="form-group">
            <label htmlFor="mov-fecha">Fecha *</label>
            <input
              id="mov-fecha"
              name="fecha"
              type="date"
              value={form.fecha}
              onChange={handleCambioForm}
              className="form-control"
              max={HOY}
            />
          </div>

          {/* Sede */}
          {esAdmin && (
            <div className="form-group">
              <label htmlFor="mov-sede">Sede *</label>
              <select
                id="mov-sede"
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

          {/* Nota */}
          <div className="form-group">
            <label htmlFor="mov-nota">Nota</label>
            <textarea
              id="mov-nota"
              name="nota"
              value={form.nota}
              onChange={handleCambioForm}
              className="form-control textarea"
              placeholder="Observaciones del movimiento..."
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventarioPage;