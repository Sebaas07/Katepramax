import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import sedesService from "@/services/sedes.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import { formatFecha } from "@/utils/formatters";
import "./SedesPage.css";

const Spinner = () => (
  <div className="sed-spinner-wrap">
    <div className="sed-spinner" />
    <span>Cargando sedes...</span>
  </div>
);

const EstadoBadge = ({ activo }) => (
  <span
    className={`sed-estado-badge ${activo ? "sed-estado-badge--activa" : "sed-estado-badge--inactiva"}`}
  >
    <span className="material-symbols-outlined" aria-hidden="true">
      {activo ? "check_circle" : "cancel"}
    </span>
    {activo ? "Activa" : "Inactiva"}
  </span>
);

const SedesPage = () => {
  const { esAdmin, isAuthenticated, isSessionChecked } = useAuth();

  const [sedes, setSedes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalConfirmAbierto, setModalConfirmAbierto] = useState(false);
  const [sedeSel, setSedeSel] = useState(null);
  const [sedeAToggle, setSedeAToggle] = useState(null);
  const [nombre, setNombre] = useState("");
  const [errorNombre, setErrorNombre] = useState("");

  const cargarSedes = useCallback(async () => {
    setCargando(true);
    try {
      const data = await sedesService.obtenerSedes();
      setSedes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(`Error al cargar sedes: ${error.message}`);
      setSedes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => {
      void cargarSedes();
    }, 0);
    return () => window.clearTimeout(id);
  }, [cargarSedes, isSessionChecked, isAuthenticated]);

  const totalActivas = sedes.filter((s) => s.activo).length;
  const totalInactivas = sedes.length - totalActivas;

  const abrirCrear = useCallback(() => {
    setSedeSel(null);
    setNombre("");
    setErrorNombre("");
    setModalAbierto(true);
  }, []);

  const abrirEditar = useCallback((sede) => {
    setSedeSel(sede);
    setNombre(sede.nombre ?? "");
    setErrorNombre("");
    setModalAbierto(true);
  }, []);

  const cerrarModal = useCallback(() => {
    setModalAbierto(false);
    setSedeSel(null);
    setNombre("");
    setErrorNombre("");
  }, []);

  const handleGuardar = useCallback(async () => {
    if (!esAdmin) return;
    const nombreFinal = nombre.trim();
    if (!nombreFinal) {
      setErrorNombre("El nombre de la sede es obligatorio.");
      return;
    }

    setGuardando(true);
    try {
      if (sedeSel) {
        await sedesService.actualizarSede(sedeSel.id, { nombre: nombreFinal });
        toast.success("Sede actualizada correctamente.");
      } else {
        await sedesService.crearSede({ nombre: nombreFinal });
        toast.success("Sede creada correctamente.");
      }
      cerrarModal();
      await cargarSedes();
    } catch (error) {
      toast.error(`Error al guardar sede: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  }, [esAdmin, nombre, sedeSel, cerrarModal, cargarSedes]);

  const abrirModalConfirmToggle = useCallback((sede) => {
    setSedeAToggle(sede);
    setModalConfirmAbierto(true);
  }, []);

  const cerrarModalConfirm = useCallback(() => {
    setModalConfirmAbierto(false);
    setSedeAToggle(null);
  }, []);

  const handleToggleSede = useCallback(async () => {
    if (!sedeAToggle) return;
    setGuardando(true);
    try {
      await sedesService.actualizarSede(sedeAToggle.id, {
        activo: !sedeAToggle.activo,
      });
      toast.success(
        sedeAToggle.activo
          ? `La sede "${sedeAToggle.nombre}" fue desactivada.`
          : `La sede "${sedeAToggle.nombre}" fue activada.`,
      );
      cerrarModalConfirm();
      await cargarSedes();
    } catch (error) {
      toast.error(`Error al actualizar sede: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  }, [sedeAToggle, cerrarModalConfirm, cargarSedes]);

  const columnas = useMemo(
    () => [
      { campo: "id", label: "ID", tipo: "texto" },
      { campo: "nombre", label: "Nombre", tipo: "texto" },
      { campo: "activo", label: "Estado", tipo: "booleano" },
      { campo: "creadoEn", label: "Fecha de creación", tipo: "fecha" },
    ],
    [],
  );

  const renderAcciones = useCallback(
    (sede) => [
      {
        label: "Editar",
        icon: "edit",
        onClick: () => abrirEditar(sede),
      },
      {
        label: sede.activo ? "Desactivar" : "Activar",
        icon: sede.activo ? "location_off" : "location_on",
        onClick: () => abrirModalConfirmToggle(sede),
        variante: sede.activo ? "danger" : "success",
      },
    ],
    [abrirEditar, abrirModalConfirmToggle],
  );

  const renderCeldaCustom = useCallback((fila, columna) => {
    if (columna.campo === "activo") {
      return <EstadoBadge activo={fila.activo} />;
    }
    if (columna.campo === "creadoEn") {
      return formatFecha(fila.creadoEn);
    }
    return null;
  }, []);

  return (
    <div className="sedes-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Sedes</h1>
          <p className="sed-subtitulo">
            Administra las sucursales o sedes del sistema
          </p>
        </div>

        <div className="filters">
          <button className="btn-primary" onClick={abrirCrear} type="button">
            <span className="material-symbols-outlined">add_location_alt</span>
            Nueva Sede
          </button>
        </div>
      </div>

      <div className="sed-stats">
        <div className="sed-stat-card">
          <span className="material-symbols-outlined">location_city</span>
          <div>
            <span className="sed-stat-valor">{sedes.length}</span>
            <span className="sed-stat-label">Total sedes</span>
          </div>
        </div>
        <div className="sed-stat-card sed-stat-card--activa">
          <span className="material-symbols-outlined">location_on</span>
          <div>
            <span className="sed-stat-valor">{totalActivas}</span>
            <span className="sed-stat-label">Activas</span>
          </div>
        </div>
        <div className="sed-stat-card sed-stat-card--inactiva">
          <span className="material-symbols-outlined">location_off</span>
          <div>
            <span className="sed-stat-valor">{totalInactivas}</span>
            <span className="sed-stat-label">Inactivas</span>
          </div>
        </div>
      </div>

      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : sedes.length === 0 ? (
          <EmptyState
            icono="location_city"
            titulo="No hay sedes registradas"
            detalle="Crea la primera sede para comenzar a usarla en el sistema."
          >
            <button className="btn-primary" onClick={abrirCrear} type="button">
              <span className="material-symbols-outlined">add_location_alt</span>
              Nueva Sede
            </button>
          </EmptyState>
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={sedes}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["nombre"]}
            paginacion
            renderAcciones={renderAcciones}
            renderCeldaCustom={renderCeldaCustom}
          />
        )}
      </div>

      <Modal
        isOpen={modalAbierto}
        onClose={cerrarModal}
        titulo={sedeSel ? "Editar Sede" : "Nueva Sede"}
        textoBotonConfirmar={
          guardando ? "Guardando..." : sedeSel ? "Actualizar" : "Crear Sede"
        }
        onConfirmar={handleGuardar}
        mostrarCancelar
        disabled={guardando}
        maxWidth="480px"
      >
        <div className="modal-form modal-form--sede">
          <div className="form-group">
            <label htmlFor="sed-nombre">Nombre de la sede *</label>
            <input
              id="sed-nombre"
              name="nombre"
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setErrorNombre("");
              }}
              className="form-control"
              placeholder="Ej: Medellín, Cali, Barranquilla..."
              autoComplete="off"
            />
            {errorNombre && <span className="form-error">{errorNombre}</span>}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalConfirmAbierto}
        onClose={cerrarModalConfirm}
        titulo={sedeAToggle?.activo ? "Desactivar Sede" : "Activar Sede"}
        textoBotonConfirmar={
          guardando ? "Procesando..." : sedeAToggle?.activo ? "Sí, desactivar" : "Sí, activar"
        }
        onConfirmar={handleToggleSede}
        mostrarCancelar
      >
        <div className="sed-confirm-body">
          <span className="material-symbols-outlined sed-confirm-icon">
            {sedeAToggle?.activo ? "location_off" : "location_on"}
          </span>
          <p>
            ¿Está seguro de que desea{" "}
            <strong>{sedeAToggle?.activo ? "desactivar" : "activar"}</strong> la
            sede <strong>{sedeAToggle?.nombre}</strong>?
          </p>
          <p className="sed-confirm-sub">
            {sedeAToggle?.activo
              ? "La sede ya no aparecerá en los selectores y no permitirá nuevos cargos."
              : "La sede volverá a estar disponible para todo el sistema."}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default SedesPage;