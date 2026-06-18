import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import proveedoresService from "@/services/proveedores.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import "./ProveedoresPage.css";

const ProveedoresPage = () => {
  const { esAdmin, esBodega } = useAuth();

  const [proveedores, setProveedores] = useState([]);
  const [filtros, setFiltros] = useState({ activo: "" });
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalProveedorAbierto, setModalProveedorAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [formProveedor, setFormProveedor] = useState({
    nombre: "",
    activo: true,
  });

  const recargarProveedores = useCallback(async () => {
    setCargando(true);
    try {
      const proveedoresData = await proveedoresService.obtenerProveedores(filtros);
      setProveedores(Array.isArray(proveedoresData) ? proveedoresData : []);
    } catch (error) {
      toast.error("Error al cargar los datos de proveedores: " + error.message);
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
    const valor = type === "checkbox" ? checked : value;
    setFormProveedor((prev) => ({ ...prev, [name]: valor }));
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
      const proveedorData = {
        nombre: formProveedor.nombre.trim(),
        activo: formProveedor.activo,
      };

      if (proveedorSeleccionado) {
        await proveedoresService.actualizarProveedor(
          proveedorSeleccionado.id,
          proveedorData,
        );
        toast.success("Proveedor actualizado exitosamente.");
      } else {
        await proveedoresService.crearProveedor(proveedorData);
        toast.success("Proveedor creado exitosamente.");
      }

      setModalProveedorAbierto(false);
      resetFormProveedor();
      await recargarProveedores();
    } catch (error) {
      console.error("Error saving proveedor:", error);
      toast.error("Error al guardar el proveedor: " + error.message);
    } finally {
      setGuardando(false);
    }
  }, [formProveedor, proveedorSeleccionado, recargarProveedores, resetFormProveedor]);

  const handleEliminarProveedor = useCallback(async () => {
    if (!proveedorSeleccionado) {
      toast.error("No hay proveedor seleccionado.");
      return;
    }

    setGuardando(true);
    try {
      await proveedoresService.eliminarProveedor(proveedorSeleccionado.id);
      setModalEliminarAbierto(false);
      await recargarProveedores();
      toast.success("Proveedor desactivado exitosamente.");
    } catch (error) {
      console.error("Error desactivando proveedor:", error);
      toast.error("Error al desactivar el proveedor: " + error.message);
    } finally {
      setGuardando(false);
    }
  }, [proveedorSeleccionado, recargarProveedores]);

  const handleReactivarProveedor = useCallback(
    async (proveedor) => {
      try {
        await proveedoresService.actualizarProveedor(proveedor.id, {
          activo: true,
        });
        await recargarProveedores();
        toast.success("Proveedor reactivado exitosamente.");
      } catch (error) {
        console.error("Error reactivando proveedor:", error);
        toast.error("Error al reactivar el proveedor: " + error.message);
      }
    },
    [recargarProveedores],
  );

  const abrirNuevoProveedor = useCallback(() => {
    setProveedorSeleccionado(null);
    resetFormProveedor();
    setModalProveedorAbierto(true);
  }, [resetFormProveedor]);

  const abrirEditarProveedor = useCallback((proveedor) => {
    setProveedorSeleccionado(proveedor);
    setFormProveedor({
      nombre: proveedor.nombre,
      activo: proveedor.activo,
    });
    setModalProveedorAbierto(true);
  }, []);

  const abrirEliminarProveedor = useCallback((proveedor) => {
    setProveedorSeleccionado(proveedor);
    setModalEliminarAbierto(true);
  }, []);

  const columnasProveedores = useMemo(
    () => [
      { campo: "nombre", label: "Nombre", tipo: "texto" },
      { campo: "activo", label: "Estado", tipo: "booleano" },
    ],
    [],
  );

  const acciones = useMemo(
    () => (proveedor) => {
      const base = [];

      if (esBodega) {
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
    },
    [
      esAdmin,
      esBodega,
      abrirEditarProveedor,
      abrirEliminarProveedor,
      handleReactivarProveedor,
    ],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      void recargarProveedores();
    }, 0);

    return () => window.clearTimeout(id);
  }, [recargarProveedores]);

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

          {esBodega && (
            <button
              className="btn-primary"
              onClick={abrirNuevoProveedor}
              type="button"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
              Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

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
          <div className="form-group">
            <label htmlFor="nombre-input">Nombre</label>
            <input
              id="nombre-input"
              type="text"
              name="nombre"
              value={formProveedor.nombre}
              onChange={handleCambioFormProveedor}
              className="form-control"
              placeholder="Nombre del proveedor"
              autoComplete="off"
              autoFocus={!proveedorSeleccionado}
            />
          </div>

          <div className="form-group form-group--check">
            <label className="prov-check-label" htmlFor="activo-checkbox">
              <input
                id="activo-checkbox"
                type="checkbox"
                name="activo"
                checked={formProveedor.activo}
                onChange={handleCambioFormProveedor}
                className="prov-checkbox"
              />
              Proveedor activo
            </label>
          </div>
        </div>
      </Modal>

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
              <span
                className="material-symbols-outlined prov-confirm-icon"
                aria-hidden="true"
              >
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
