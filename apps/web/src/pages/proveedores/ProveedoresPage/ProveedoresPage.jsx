import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import proveedoresService from "@/services/proveedores.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import "./ProveedoresPage.css";

const ProveedoresPage = () => {
  const { esAdmin, esBodega, isAuthenticated, isSessionChecked } = useAuth();
  const puedeGestionar = esAdmin || esBodega;

  const [proveedores, setProveedores] = useState([]);
  const [filtros, setFiltros] = useState({ activo: "" });
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalProveedorAbierto, setModalProveedorAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [formProveedor, setFormProveedor] = useState({ nombre: "", activo: true });

  const recargarProveedores = useCallback(async () => {
    setCargando(true);
    try {
      const data = await proveedoresService.obtenerProveedores(filtros);
      setProveedores(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Error al cargar proveedores: " + error.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  const handleCambioFiltro = useCallback((e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCambioFormProveedor = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormProveedor((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }, []);

  const resetFormProveedor = useCallback(() => {
    setFormProveedor({ nombre: "", activo: true });
  }, []);

  const handleGuardarProveedor = useCallback(async () => {
    if (!formProveedor.nombre.trim()) {
      toast.error("Por favor ingrese el nombre del proveedor.");
      return;
    }
    setGuardando(true);
    try {
      const data = { nombre: formProveedor.nombre.trim(), activo: formProveedor.activo };
      if (proveedorSeleccionado) {
        await proveedoresService.actualizarProveedor(proveedorSeleccionado.id, data);
        toast.success("Proveedor actualizado exitosamente.");
      } else {
        await proveedoresService.crearProveedor(data);
        toast.success("Proveedor creado exitosamente.");
      }
      setModalProveedorAbierto(false);
      resetFormProveedor();
      await recargarProveedores();
    } catch (error) {
      toast.error("Error al guardar el proveedor: " + error.message);
    } finally {
      setGuardando(false);
    }
  }, [formProveedor, proveedorSeleccionado, recargarProveedores, resetFormProveedor]);

  const handleEliminarProveedor = useCallback(async () => {
    if (!proveedorSeleccionado) return;
    setGuardando(true);
    try {
      await proveedoresService.eliminarProveedor(proveedorSeleccionado.id);
      setModalEliminarAbierto(false);
      await recargarProveedores();
      toast.success("Proveedor desactivado exitosamente.");
    } catch (error) {
      toast.error("Error al desactivar el proveedor: " + error.message);
    } finally {
      setGuardando(false);
    }
  }, [proveedorSeleccionado, recargarProveedores]);

  const handleReactivarProveedor = useCallback(async (proveedor) => {
    try {
      await proveedoresService.actualizarProveedor(proveedor.id, { activo: true });
      await recargarProveedores();
      toast.success("Proveedor reactivado exitosamente.");
    } catch (error) {
      toast.error("Error al reactivar el proveedor: " + error.message);
    }
  }, [recargarProveedores]);

  const abrirNuevoProveedor = useCallback(() => {
    setProveedorSeleccionado(null);
    resetFormProveedor();
    setModalProveedorAbierto(true);
  }, [resetFormProveedor]);

  const abrirEditarProveedor = useCallback((proveedor) => {
    setProveedorSeleccionado(proveedor);
    setFormProveedor({ nombre: proveedor.nombre, activo: proveedor.activo });
    setModalProveedorAbierto(true);
  }, []);

  const abrirEliminarProveedor = useCallback((proveedor) => {
    setProveedorSeleccionado(proveedor);
    setModalEliminarAbierto(true);
  }, []);

  const columnasProveedores = useMemo(() => [
    { campo: "nombre", label: "Nombre", tipo: "texto" },
    { campo: "activo", label: "Estado", tipo: "booleano" },
  ], []);

  const acciones = useMemo(() => (proveedor) => {
    const base = [];
    // Admin y Bodega pueden editar
    if (puedeGestionar) {
      base.push({
        label: "Editar",
        icon: "edit",
        onClick: () => abrirEditarProveedor(proveedor),
      });
    }
    if (esAdmin && proveedor.activo) {
      base.push({
        label: "Desactivar",
        icon: "delete",
        variante: "danger",
        onClick: () => abrirEliminarProveedor(proveedor),
      });
    }
    if (esAdmin && !proveedor.activo) {
      base.push({
        label: "Reactivar",
        icon: "restore_from_trash",
        variante: "success",
        onClick: () => handleReactivarProveedor(proveedor),
      });
    }
    return base;
  }, [esAdmin, puedeGestionar, abrirEditarProveedor, abrirEliminarProveedor, handleReactivarProveedor]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => { void recargarProveedores(); }, 0);
    return () => window.clearTimeout(id);
  }, [recargarProveedores, isSessionChecked, isAuthenticated]);

  // Stats
  const totalActivos   = proveedores.filter((p) => p.activo).length;
  const totalInactivos = proveedores.filter((p) => !p.activo).length;

  return (
    <div className="proveedores-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Proveedores</h1>
          <p className="proveedores-subtitulo">
            Administra la red de proveedores activos e inactivos
          </p>
        </div>

        <div className="filters">
          <div className="filter-group">
            <label htmlFor="activo-filter">Estado</label>
            <select
              id="activo-filter"
              value={filtros.activo}
              onChange={handleCambioFiltro}
              name="activo"
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          {/* Botón visible para Admin y Bodega */}
          {puedeGestionar && (
            <button className="btn-primary" onClick={abrirNuevoProveedor} type="button">
              <span className="material-symbols-outlined" aria-hidden="true">add</span>
              Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {proveedores.length > 0 && (
        <div className="prov-stats">
          <div className="prov-stat-card">
            <div className="prov-stat-card__icon">
              <span className="material-symbols-outlined">conveyor_belt</span>
            </div>
            <div className="prov-stat-card__body">
              <span className="prov-stat-card__valor">{proveedores.length}</span>
              <span className="prov-stat-card__label">Total</span>
            </div>
          </div>
          <div className="prov-stat-card">
            <div className="prov-stat-card__icon">
              <span className="material-symbols-outlined">check_circle</span>
            </div>
            <div className="prov-stat-card__body">
              <span className="prov-stat-card__valor">{totalActivos}</span>
              <span className="prov-stat-card__label">Activos</span>
            </div>
          </div>
          {totalInactivos > 0 && (
            <div className="prov-stat-card">
              <div className="prov-stat-card__icon">
                <span className="material-symbols-outlined">block</span>
              </div>
              <div className="prov-stat-card__body">
                <span className="prov-stat-card__valor">{totalInactivos}</span>
                <span className="prov-stat-card__label">Inactivos</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="tab-content">
        {cargando ? (
          <div className="prov-spinner-wrap">
            <div className="prov-spinner" aria-hidden="true" />
            <span>Cargando proveedores...</span>
          </div>
        ) : proveedores.length > 0 ? (
          <TablaGenerica
            columnas={columnasProveedores}
            datos={proveedores}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["nombre"]}
            paginacion
            renderAcciones={acciones}
          />
        ) : (
          <EmptyState
            icono="conveyor_belt"
            titulo="No hay proveedores registrados"
            detalle={
              filtros.activo
                ? "Prueba cambiando el filtro de estado."
                : "Crea un nuevo proveedor para comenzar."
            }
          />
        )}
      </div>

      {/* Modal — Crear / Editar Proveedor */}
      <Modal
        isOpen={modalProveedorAbierto}
        onClose={() => setModalProveedorAbierto(false)}
        titulo={proveedorSeleccionado ? "Editar Proveedor" : "Nuevo Proveedor"}
        onConfirmar={handleGuardarProveedor}
        mostrarCancelar
        disabled={guardando}
        textoBotonConfirmar={guardando ? "Guardando..." : "Guardar Proveedor"}
      >
        <div className="modal-form">
          {/* Ícono decorativo solo en creación */}
          {!proveedorSeleccionado && (
            <div className="prov-modal-header-icon">
              <span className="material-symbols-outlined">conveyor_belt</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="nombre-input">Nombre del Proveedor *</label>
            <input
              id="nombre-input"
              type="text"
              name="nombre"
              value={formProveedor.nombre}
              onChange={handleCambioFormProveedor}
              className="form-control"
              placeholder="Ej: Distribuidora Carnes El Rey"
              autoComplete="off"
              autoFocus={!proveedorSeleccionado}
            />
            <span className="prov-nombre-hint">
              Ingresa el nombre exacto tal como aparecerá en los registros
            </span>
          </div>

          {/* Toggle de estado activo */}
          <div className="prov-activo-card">
            <div className="prov-activo-card__info">
              <span className="prov-activo-card__label">Proveedor activo</span>
              <span className="prov-activo-card__sub">
                {formProveedor.activo
                  ? "Visible en el sistema y disponible para asignar"
                  : "Oculto de los listados activos"}
              </span>
            </div>
            <label className="prov-toggle" aria-label="Proveedor activo">
              <input
                type="checkbox"
                name="activo"
                checked={formProveedor.activo}
                onChange={handleCambioFormProveedor}
              />
              <span className="prov-toggle__slider" />
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal — Confirmar desactivar */}
      <Modal
        isOpen={modalEliminarAbierto}
        onClose={() => setModalEliminarAbierto(false)}
        titulo="Desactivar Proveedor"
        onConfirmar={handleEliminarProveedor}
        mostrarCancelar
        disabled={guardando}
        textoBotonConfirmar={guardando ? "Desactivando..." : "Desactivar"}
      >
        <div className="modal-form prov-confirm-body">
          {proveedorSeleccionado && (
            <>
              <span className="material-symbols-outlined prov-confirm-icon" aria-hidden="true">
                warning
              </span>
              <div>
                <p>
                  ¿Está seguro de que desea desactivar a{" "}
                  <strong>{proveedorSeleccionado.nombre}</strong>?
                </p>
                <p className="prov-confirm-sub">
                  Esta acción ocultará el proveedor de los listados activos.
                </p>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProveedoresPage;
