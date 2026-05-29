import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import inventarioService from "@/services/inventario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import { getSemanaISO, formatCOP } from "@/utils/formatters";
import "./InventarioPage.css";

const HOY = new Date().toISOString().split("T")[0];
const SEMANA_ACTUAL = getSemanaISO(new Date());

const Spinner = () => (
  <div className="inv-spinner-wrap">
    <div className="inv-spinner" />
    <span>Cargando...</span>
  </div>
);

// Form inicial alineado con el contrato real del backend
const FORM_ENTRADA_INICIAL = {
  fecha:             HOY,
  semana:            String(SEMANA_ACTUAL),
  sedeId:            "",
  productoId:        "",
  cantidadIngresada: "",
  costo:             "",
};

const InventarioPage = () => {
  const { usuario, esAdmin, esBodega } = useAuth();
  const puedeRegistrar = esAdmin || esBodega;

  // Sede del usuario (Bodega solo ve la suya, Admin puede cambiar)
  const sedeIdUsuario = usuario?.sedeId ?? null;

  const [activeTab,   setActiveTab]   = useState("entradas");
  const [productos,   setProductos]   = useState([]);
  const [entradas,    setEntradas]    = useState([]);
  const [cargando,    setCargando]    = useState(false);
  const [guardando,   setGuardando]   = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({
    ...FORM_ENTRADA_INICIAL,
    sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
  });

  // Filtros para el tab de entradas
  const [filtros, setFiltros] = useState({
    sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
    semana: String(SEMANA_ACTUAL),
  });

  // ── Carga ────────────────────────────────────────────────
  const cargarProductos = useCallback(async () => {
    try {
      const data = await inventarioService.obtenerProductos({ activo: "true" });
      setProductos(data);
    } catch (err) {
      toast.error("Error al cargar productos: " + err.message);
    }
  }, []);

  const cargarEntradas = useCallback(async () => {
    setCargando(true);
    try {
      const params = {};
      if (filtros.sedeId) params.sedeId = parseInt(filtros.sedeId);
      if (filtros.semana) params.semana  = parseInt(filtros.semana);
      const data = await inventarioService.listarEntradas(params);
      setEntradas(data);
    } catch (err) {
      toast.error("Error al cargar entradas: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  useEffect(() => {
    if (activeTab === "entradas") cargarEntradas();
  }, [activeTab, cargarEntradas]);

  // ── Handlers form ────────────────────────────────────────
  const handleCambioForm = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Calcular semana automáticamente al cambiar fecha
      if (name === "fecha" && value) {
        next.semana = String(getSemanaISO(new Date(value)));
      }
      return next;
    });
  };

  const handleSeleccionProducto = (e) => {
    const codigo = e.target.value;
    const prod = productos.find((p) => p.codigo === codigo);
    setForm((prev) => ({
      ...prev,
      productoId: codigo,
      // Autocompletar costo con precioCosto del producto
      costo: prod ? String(prod.precioCosto ?? "") : prev.costo,
    }));
  };

  const abrirModal = () => {
    setForm({
      ...FORM_ENTRADA_INICIAL,
      sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
    });
    setModalAbierto(true);
  };

  // ── Guardar entrada ──────────────────────────────────────
  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await inventarioService.registrarEntrada({
        fecha:             form.fecha,
        semana:            parseInt(form.semana),
        sedeId:            parseInt(form.sedeId),
        productoId:        form.productoId,
        cantidadIngresada: parseInt(form.cantidadIngresada),
        costo:             parseFloat(form.costo),
      });
      toast.success("Entrada registrada correctamente.");
      setModalAbierto(false);
      await cargarEntradas();
    } catch (err) {
      toast.error("Error al registrar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Columnas ─────────────────────────────────────────────
  const columnasProductos = [
    { campo: "codigo",             label: "Código",      tipo: "texto"    },
    { campo: "descripcion",        label: "Producto",    tipo: "texto"    },
    { campo: "precioCosto",        label: "Costo",       tipo: "moneda"   },
    { campo: "precioVenta",        label: "P. Venta",    tipo: "moneda"   },
    { campo: "precioMayoreo",      label: "Mayoreo",     tipo: "moneda"   },
    { campo: "porcentajeGanancia", label: "% Ganancia",  tipo: "texto"    },
    { campo: "activo",             label: "Estado",      tipo: "booleano" },
  ];

  const columnasEntradas = [
    { campo: "fecha",             label: "Fecha",      tipo: "fecha"  },
    { campo: "semana",            label: "Semana",     tipo: "texto"  },
    { campo: "sede",              label: "Sede",       tipo: "texto"  }, // nombre sede
    { campo: "producto",          label: "Producto",   tipo: "texto"  }, // descripción producto
    { campo: "cantidadIngresada", label: "Cantidad",   tipo: "texto"  },
    { campo: "costo",             label: "Costo",      tipo: "moneda" },
  ];

  // Mapear datos de entradas para la tabla (extraer campos anidados)
  const entradasMapeadas = entradas.map((e) => ({
    ...e,
    sede:    e.sede?.nombre    ?? `Sede ${e.sedeId}`,
    producto: e.producto?.descripcion ?? e.productoId,
  }));

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="inventario-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Gestión de Inventario</h1>
        </div>
        <div className="inv-header-acciones">
          {/* Tabs */}
          <div className="tabs">
            <button
              className={activeTab === "productos" ? "tab-active" : "tab-btn"}
              onClick={() => setActiveTab("productos")}
              type="button"
            >
              <span className="material-symbols-outlined">category</span>
              Productos
            </button>
            <button
              className={activeTab === "entradas" ? "tab-active" : "tab-btn"}
              onClick={() => setActiveTab("entradas")}
              type="button"
            >
              <span className="material-symbols-outlined">move_to_inbox</span>
              Entradas
            </button>
          </div>

          {/* Botón registrar entrada */}
          {puedeRegistrar && activeTab === "entradas" && (
            <button className="btn-primary" onClick={abrirModal} type="button">
              <span className="material-symbols-outlined">add</span>
              Registrar entrada
            </button>
          )}
        </div>
      </div>

      {/* Filtros del tab entradas */}
      {activeTab === "entradas" && (
        <div className="inv-filtros">
          {esAdmin && (
            <div className="filter-group">
              <label htmlFor="inv-filtro-sede">Sede</label>
              <select
                id="inv-filtro-sede"
                value={filtros.sedeId}
                onChange={(e) => setFiltros((p) => ({ ...p, sedeId: e.target.value }))}
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
            <label htmlFor="inv-filtro-semana">Semana</label>
            <input
              id="inv-filtro-semana"
              type="number"
              min="1"
              max="53"
              value={filtros.semana}
              onChange={(e) => setFiltros((p) => ({ ...p, semana: e.target.value }))}
              className="filter-select"
              style={{ minWidth: 80 }}
            />
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : activeTab === "productos" ? (
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
              datos={productos}
              filasPorPagina={10}
              mostrarBuscador
              buscarEnCampos={["codigo", "descripcion"]}
              paginacion
            />
          </>
        ) : (
          <>
            <div className="page-actions">
              <h2>
                <span className="material-symbols-outlined">move_to_inbox</span>
                Entradas de Inventario
              </h2>
              <span className="inv-contador">{entradas.length} registros</span>
            </div>
            <TablaGenerica
              columnas={columnasEntradas}
              datos={entradasMapeadas}
              filasPorPagina={10}
              mostrarBuscador
              buscarEnCampos={["sede", "producto"]}
              paginacion
            />
          </>
        )}
      </div>

      {/* Modal — Registrar entrada */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        titulo="Registrar Entrada de Inventario"
        textoBotonConfirmar={guardando ? "Guardando..." : "Registrar"}
        onConfirmar={handleGuardar}
        mostrarCancelar
      >
        <div className="modal-form">
          {/* Fecha */}
          <div className="form-group">
            <label htmlFor="inv-fecha">Fecha *</label>
            <input
              id="inv-fecha"
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleCambioForm}
              className="form-control"
              max={HOY}
            />
          </div>

          {/* Semana (auto) */}
          <div className="form-group">
            <label htmlFor="inv-semana">Semana (calculada automáticamente)</label>
            <input
              id="inv-semana"
              type="number"
              name="semana"
              value={form.semana}
              onChange={handleCambioForm}
              className="form-control"
              min="1"
              max="53"
              readOnly
              style={{ opacity: 0.6, cursor: "not-allowed" }}
            />
          </div>

          {/* Sede */}
          {esAdmin && (
            <div className="form-group">
              <label htmlFor="inv-sede">Sede *</label>
              <select
                id="inv-sede"
                name="sedeId"
                value={form.sedeId}
                onChange={handleCambioForm}
                className="form-control"
              >
                <option value="">— Selecciona una sede —</option>
                <option value="1">Bogotá</option>
                <option value="2">Cartagena</option>
                <option value="3">Villavicencio</option>
              </select>
            </div>
          )}

          {/* Producto */}
          <div className="form-group">
            <label htmlFor="inv-producto">Producto *</label>
            <select
              id="inv-producto"
              value={form.productoId}
              onChange={handleSeleccionProducto}
              className="form-control"
            >
              <option value="">— Selecciona un producto —</option>
              {productos.map((p) => (
                <option key={p.codigo} value={p.codigo}>
                  [{p.codigo}] {p.descripcion}
                </option>
              ))}
            </select>
          </div>

          {/* Cantidad ingresada */}
          <div className="form-group">
            <label htmlFor="inv-cantidad">Cantidad ingresada *</label>
            <input
              id="inv-cantidad"
              type="number"
              name="cantidadIngresada"
              value={form.cantidadIngresada}
              onChange={handleCambioForm}
              className="form-control"
              min="1"
              step="1"
              placeholder="0"
            />
          </div>

          {/* Costo */}
          <div className="form-group">
            <label htmlFor="inv-costo">Costo total (COP) *</label>
            <input
              id="inv-costo"
              type="number"
              name="costo"
              value={form.costo}
              onChange={handleCambioForm}
              className="form-control"
              min="0"
              step="1000"
              placeholder="0"
            />
            {form.costo && (
              <span className="inv-costo-preview">
                {formatCOP(form.costo)}
              </span>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventarioPage;
