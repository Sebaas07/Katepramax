import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import inventarioService from "@/services/inventario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import DatePicker from "@/components/common/DatePicker/DatePicker";
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
// Nota: el catálogo de productos vive en su propio módulo (/productos),
// así que aquí solo mostramos movimientos de stock, separados por tipo.
const TABS = [
  { key: "entradas", label: "Entradas", icon: "move_to_inbox" },
  { key: "salidas", label: "Salidas", icon: "outbox" },
  { key: "ajustes", label: "Ajustes", icon: "tune" },
];

const TAB_TIPO = { entradas: "entrada", salidas: "salida", ajustes: "ajuste" };

const InventarioPage = () => {
  const { usuario, esAdmin, esBodega, isAuthenticated, isSessionChecked } =
    useAuth();
  const puedeRegistrar = esAdmin || esBodega;
  // La sede de trabajo del usuario. Un Bodega y un Oficinista cuya oficina se
  // alimenta de una bodega operan sobre esa bodega (bodegaId); un Admin y
  // AdminBogota usan su propia sede.
  const sedeIdUsuario =
    esBodega || usuario?.rol === "Oficinista"
      ? (usuario?.bodegaId ?? usuario?.sedeId ?? null)
      : (usuario?.sedeId ?? null);

  const [activeTab, setActiveTab] = useState("entradas");
  const [productos, setProductos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardandoMov, setGuardandoMov] = useState(false);
  const [modalMovAbierto, setModalMovAbierto] = useState(false);

  // Formulario movimiento
  const [form, setForm] = useState({
    tipo: "entrada",
    productoId: "",
    cantidad: "",
    signoAjuste: "sumar",
    nota: "",
    sedeId: "",
    fecha: HOY,
  });

  // Filtros de la tabla (el tipo ya lo determina la tab activa)
  const [filtrosMov, setFiltrosMov] = useState({
    sedeId: "",
    productoId: "",
  });

  // ── Carga de datos ───────────────────────────────────────────
  const cargarSedes = useCallback(async () => {
    try {
      const data = await inventarioService.obtenerSedes();
      setSedes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error al cargar sedes:", err);
      setSedes([]);
    }
  }, []);

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
      const params = { tipo: TAB_TIPO[activeTab] };
      if (esAdmin && filtrosMov.sedeId) params.sedeId = parseInt(filtrosMov.sedeId);
      if (!esAdmin && sedeIdUsuario) params.sedeId = sedeIdUsuario;
      if (filtrosMov.productoId) params.productoId = filtrosMov.productoId;
      const data = await inventarioService.listarMovimientos(params);
      setMovimientos(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Error al cargar movimientos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [activeTab, filtrosMov.sedeId, filtrosMov.productoId, esAdmin, sedeIdUsuario]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    void cargarSedes();
    void cargarProductos();
  }, [isSessionChecked, isAuthenticated, cargarSedes, cargarProductos]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;

    const id = window.setTimeout(() => {
      void cargarMovimientos();
    }, 0);

    return () => window.clearTimeout(id);
  }, [
    activeTab,
    cargarMovimientos,
    isSessionChecked,
    isAuthenticated,
  ]);

  // ── Handlers formulario ──────────────────────────────────────
  const handleCambioForm = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const abrirModalMovimiento = () => {
    setForm({
      tipo: TAB_TIPO[activeTab] ?? "entrada",
      productoId: "",
      cantidad: "",
      signoAjuste: "sumar",
      nota: "",
      sedeId: esAdmin ? "" : String(sedeIdUsuario),
      fecha: HOY,
    });
    setModalMovAbierto(true);
  };

  const handleGuardarMovimiento = async () => {
    setGuardandoMov(true);
    try {
      const magnitud = Math.abs(parseInt(form.cantidad) || 0);
      if (form.tipo === "ajuste" && magnitud === 0) {
        toast.error("Indica cuántas unidades quieres sumar o restar.");
        setGuardandoMov(false);
        return;
      }
      const cantidadFinal =
        form.tipo === "ajuste" && form.signoAjuste === "restar" ? -magnitud : magnitud;

      await inventarioService.registrarMovimiento({
        tipo: form.tipo,
        productoId: form.productoId,
        cantidad: cantidadFinal,
        nota: form.nota || null,
        sedeId: parseInt(form.sedeId),
        fecha: form.fecha,
      });
      toast.success("Movimiento registrado correctamente.");
      window.dispatchEvent(new Event("katepramax:inventario-actualizado"));
      setModalMovAbierto(false);
      await cargarMovimientos();
      await cargarProductos();
    } catch (err) {
      toast.error("Error al registrar: " + err.message);
    } finally {
      setGuardandoMov(false);
    }
  };

  // ── Columnas ───────────────────────────────────────────────────
  const columnasMovimientos = [
    { campo: "id", label: "ID", tipo: "texto" },
    { campo: "fecha", label: "Fecha", tipo: "fecha" },
    { campo: "semana", label: "Semana", tipo: "texto" },
    { campo: "producto", label: "Producto", tipo: "texto" },
    { campo: "sede", label: "Sede", tipo: "texto" },
    { campo: "cantidadIngresada", label: "Cantidad", tipo: "texto" },
    { campo: "costoUnitario", label: "Costo Unit.", tipo: "moneda" },
    { campo: "nota", label: "Nota", tipo: "texto" },
    { campo: "creadoEn", label: "Registrado", tipo: "fecha" },
  ];

  const movimientosMapeados = useMemo(
    () =>
      movimientos.map((m) => ({
        ...m,
        producto: m.producto?.descripcion ?? String(m.productoId ?? "—"),
        sede: m.sede?.nombre ?? `Sede ${m.sedeId}`,
        costoUnitario: Number(m.costoUnitario ?? 0),
        nota: m.nota ?? "—",
      })),
    [movimientos],
  );

  // Stats stock bajo
  const stockBajoCount = productos.filter(
    (p) => p.existencia <= p.stockMinimo,
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
            <button
              className="btn-primary"
              onClick={abrirModalMovimiento}
              type="button"
            >
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
              <strong>{stockBajoCount} productos</strong> con stock bajo
              requieren atención
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
            {/* Filtros */}
            <div className="inv-filtros">
              {esAdmin && (
                <div className="filter-group">
                  <label htmlFor="mov-filtro-sede">Sede</label>
                  <select
                    id="mov-filtro-sede"
                    value={filtrosMov.sedeId}
                    onChange={(e) =>
                      setFiltrosMov((p) => ({
                        ...p,
                        sedeId: e.target.value,
                      }))
                    }
                    className="filter-select"
                  >
                    <option value="">Todas</option>
                    {sedes.map((sede) => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="page-actions">
              <h2>
                <span className="material-symbols-outlined">
                  {TABS.find((t) => t.key === activeTab)?.icon}
                </span>
                {TABS.find((t) => t.key === activeTab)?.label} de Inventario
              </h2>
              <span className="inv-contador">
                {movimientos.length} registros
              </span>
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
          {form.tipo === "ajuste" ? (
            <div className="form-group">
              <span className="form-label-standalone">¿Sumar o restar? *</span>
              <div className="mov-signo-toggle">
                <button
                  type="button"
                  className={form.signoAjuste === "sumar" ? "mov-signo-btn mov-signo-btn--activo-suma" : "mov-signo-btn"}
                  onClick={() => setForm({ ...form, signoAjuste: "sumar" })}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">add</span>
                  Sumar
                </button>
                <button
                  type="button"
                  className={form.signoAjuste === "restar" ? "mov-signo-btn mov-signo-btn--activo-resta" : "mov-signo-btn"}
                  onClick={() => setForm({ ...form, signoAjuste: "restar" })}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">remove</span>
                  Restar
                </button>
              </div>

              <label htmlFor="mov-cantidad" className="mov-cantidad-label">
                Unidades a {form.signoAjuste === "restar" ? "restar" : "sumar"} *
              </label>
              <input
                id="mov-cantidad"
                name="cantidad"
                type="number"
                value={form.cantidad}
                onChange={handleCambioForm}
                className="form-control"
                min="1"
                step="1"
                placeholder="0"
              />
              <span className="form-hint">
                Se guardará como{" "}
                <strong>
                  {form.signoAjuste === "restar" ? "−" : "+"}
                  {Math.abs(parseInt(form.cantidad) || 0)}
                </strong>{" "}
                en el inventario.
              </span>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="mov-cantidad">Cantidad *</label>
              <input
                id="mov-cantidad"
                name="cantidad"
                type="number"
                value={form.cantidad}
                onChange={handleCambioForm}
                className="form-control"
                min="1"
                step="1"
                placeholder="0"
              />
            </div>
          )}

          {/* Fecha */}
          <div className="form-group">
            <label htmlFor="mov-fecha">Fecha *</label>
            <DatePicker
              id="mov-fecha"
              name="fecha"
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
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
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
