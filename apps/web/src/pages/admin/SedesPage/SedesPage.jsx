import { useCallback, useEffect, useMemo, useReducer } from "react";
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

const TipoBadge = ({ tipo }) => (
  <span
    className={`sed-tipo-badge ${tipo === "Oficina" ? "sed-tipo-badge--oficina" : "sed-tipo-badge--bodega"}`}
  >
    <span className="material-symbols-outlined" aria-hidden="true">
      {tipo === "Oficina" ? "storefront" : "warehouse"}
    </span>
    {tipo === "Oficina" ? "Oficina" : "Bodega"}
  </span>
);

const ESTADO_INICIAL = {
  sedes: [],
  cargando: false,
  guardando: false,
  modalAbierto: false,
  modalConfirmAbierto: false,
  sedeSel: null,
  sedeAToggle: null,
  nombre: "",
  tipo: "Bodega",
  bodegaId: "",
  errorNombre: "",
};

const reducerSedes = (state, action) => {
  if (action.type === "actualizar") {
    return { ...state, [action.campo]: action.valor };
  }
  return state;
};

const SedesPage = () => {
  const { esAdminGestion, isAuthenticated, isSessionChecked } = useAuth();

  const [estado, dispatch] = useReducer(reducerSedes, ESTADO_INICIAL);
  const {
    sedes,
    cargando,
    guardando,
    modalAbierto,
    modalConfirmAbierto,
    sedeSel,
    sedeAToggle,
    nombre,
    tipo,
    bodegaId,
    errorNombre,
  } = estado;
  const actualizar = useCallback(
    (campo, valor) => dispatch({ type: "actualizar", campo, valor }),
    [],
  );
  const setSedes = useCallback((valor) => actualizar("sedes", valor), [actualizar]);
  const setCargando = useCallback((valor) => actualizar("cargando", valor), [actualizar]);
  const setGuardando = useCallback((valor) => actualizar("guardando", valor), [actualizar]);
  const setModalAbierto = useCallback((valor) => actualizar("modalAbierto", valor), [actualizar]);
  const setModalConfirmAbierto = useCallback(
    (valor) => actualizar("modalConfirmAbierto", valor),
    [actualizar],
  );
  const setSedeSel = useCallback((valor) => actualizar("sedeSel", valor), [actualizar]);
  const setSedeAToggle = useCallback((valor) => actualizar("sedeAToggle", valor), [actualizar]);
  const setNombre = useCallback((valor) => actualizar("nombre", valor), [actualizar]);
  const setTipo = useCallback((valor) => actualizar("tipo", valor), [actualizar]);
  const setBodegaId = useCallback((valor) => actualizar("bodegaId", valor), [actualizar]);
  const setErrorNombre = useCallback((valor) => actualizar("errorNombre", valor), [actualizar]);

  const cargarSedes = useCallback(async () => {
    setCargando(true);
    try {
      // En el módulo de administración se ven TODAS (incluidas inactivas).
      const data = await sedesService.obtenerSedes({ activo: "todas" });
      setSedes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(`Error al cargar sedes: ${error.message}`);
      setSedes([]);
    } finally {
      setCargando(false);
    }
  }, [setCargando, setSedes]);

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
    setTipo("Bodega");
    setBodegaId("");
    setErrorNombre("");
    setModalAbierto(true);
  }, [setBodegaId, setErrorNombre, setModalAbierto, setNombre, setSedeSel, setTipo]);

  const abrirEditar = useCallback((sede) => {
    setSedeSel(sede);
    setNombre(sede.nombre ?? "");
    setTipo(sede.tipo ?? "Bodega");
    setBodegaId(sede.bodegaId != null ? String(sede.bodegaId) : "");
    setErrorNombre("");
    setModalAbierto(true);
  }, [setBodegaId, setErrorNombre, setModalAbierto, setNombre, setSedeSel, setTipo]);

  const cerrarModal = useCallback(() => {
    setModalAbierto(false);
    setSedeSel(null);
    setNombre("");
    setTipo("Bodega");
    setBodegaId("");
    setErrorNombre("");
  }, [setBodegaId, setErrorNombre, setModalAbierto, setNombre, setSedeSel, setTipo]);

  const handleGuardar = useCallback(async () => {
    if (!esAdminGestion) return;
    const nombreFinal = nombre.trim();
    if (!nombreFinal) {
      setErrorNombre("El nombre de la sede es obligatorio.");
      return;
    }

    const nombreNormalizado = nombreFinal.toLowerCase();
    const duplicada = sedes.find((s) => {
      if (sedeSel && s.id === sedeSel.id) return false;
      return String(s.nombre ?? "").trim().toLowerCase() === nombreNormalizado;
    });
    if (duplicada) {
      setErrorNombre(
        `Ya existe una sede llamada "${duplicada.nombre}". Usa otro nombre para ${
          tipo === "Oficina" ? "la oficina" : "la sede"
        }.`,
      );
      return;
    }

    const payload = { nombre: nombreFinal, tipo };
    if (tipo === "Oficina" && bodegaId) {
      payload.bodegaId = Number(bodegaId);
    }

    setGuardando(true);
    try {
      if (sedeSel) {
        await sedesService.actualizarSede(sedeSel.id, payload);
        toast.success("Sede actualizada correctamente.");
      } else {
        await sedesService.crearSede(payload);
        toast.success("Sede creada correctamente.");
      }
      cerrarModal();
      await cargarSedes();
    } catch (error) {
      toast.error(`Error al guardar sede: ${error.message}`);
    } finally {
      setGuardando(false);
    }
  }, [esAdminGestion, nombre, tipo, bodegaId, sedeSel, cerrarModal, cargarSedes, sedes, setErrorNombre, setGuardando]);

  const abrirModalConfirmToggle = useCallback((sede) => {
    setSedeAToggle(sede);
    setModalConfirmAbierto(true);
  }, [setModalConfirmAbierto, setSedeAToggle]);

  const cerrarModalConfirm = useCallback(() => {
    setModalConfirmAbierto(false);
    setSedeAToggle(null);
  }, [setModalConfirmAbierto, setSedeAToggle]);

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
  }, [sedeAToggle, cerrarModalConfirm, cargarSedes, setGuardando]);

  const columnas = useMemo(
    () => [
      { campo: "id", label: "ID", tipo: "texto" },
      { campo: "nombre", label: "Nombre", tipo: "texto" },
      { campo: "tipo", label: "Tipo", tipo: "texto" },
      { campo: "bodega", label: "Bodega", tipo: "texto" },
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
    if (columna.campo === "tipo") {
      return <TipoBadge tipo={fila.tipo} />;
    }
    if (columna.campo === "bodega") {
      return fila.bodegaId
        ? <span className="sed-bodega-celda">{fila.bodega?.nombre ?? `#${fila.bodegaId}`}</span>
        : <span className="sed-bodega-celda sed-bodega-celda--vacio">—</span>;
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
              placeholder="Ej: Villavicencio Centro, Medellín..."
              autoComplete="off"
            />
            {errorNombre && <span className="form-error">{errorNombre}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="sed-tipo">Tipo de sede *</label>
            <select
              id="sed-tipo"
              name="tipo"
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                if (e.target.value !== "Oficina") setBodegaId("");
              }}
              className="form-control"
            >
              <option value="Bodega">Bodega</option>
              <option value="Oficina">Oficina</option>
            </select>
          </div>

          {tipo === "Oficina" && (
            <div className="form-group">
              <label htmlFor="sed-bodega">Bodega de la oficina</label>
              <select
                id="sed-bodega"
                name="bodegaId"
                value={bodegaId}
                onChange={(e) => setBodegaId(e.target.value)}
                className="form-control"
              >
                <option value="">Seleccione una bodega...</option>
                {sedes.flatMap((s) =>
                  s.tipo === "Bodega" && s.activo && s.id !== sedeSel?.id
                    ? [
                        <option key={s.id} value={s.id}>
                          {s.nombre}
                        </option>,
                      ]
                    : [],
                )}
              </select>
              <span className="form-hint">
                La oficina verá y despachará los envíos de esta bodega.
              </span>
            </div>
          )}
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