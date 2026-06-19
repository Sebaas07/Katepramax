import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import auditService from "@/services/audit.service";
import { formatFechaHora, formatRelativo, truncar } from "@/utils/formatters";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import "./AuditLogPage.css";

const Spinner = () => (
  <div className="audit-spinner-wrap">
    <div className="audit-spinner" />
    <span>Cargando historial...</span>
  </div>
);

const EmptyState = ({ icono, titulo, detalle }) => (
  <div className="audit-empty">
    <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
    <p>{titulo}</p>
    {detalle && <span className="audit-empty__hint">{detalle}</span>}
  </div>
);

const ModuloBadge = ({ modulo }) => {
  const CONFIG = {
    pedidos: { label: "Pedidos", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.3)" },
    inventario: { label: "Inventario", color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.3)" },
    clientes: { label: "Clientes", color: "#ddb7ff", bg: "rgba(221,183,255,0.12)", border: "rgba(221,183,255,0.3)" },
    proveedores: { label: "Proveedores", color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
    contabilidad: { label: "Contabilidad", color: "var(--secondary)", bg: "rgba(233,195,73,0.12)", border: "rgba(233,195,73,0.3)" },
    usuarios: { label: "Usuarios", color: "#f97316", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" },
    auth: { label: "Auth", color: "#978d9d", bg: "rgba(151,141,157,0.12)", border: "rgba(151,141,157,0.3)" },
    default: { label: modulo ?? "—", color: "var(--on-surface-variant)", bg: "rgba(255,255,255,0.05)", border: "var(--outline-variant)" },
  };
  const cfg = CONFIG[modulo?.toLowerCase()] ?? CONFIG.default;
  return (
    <span className="audit-modulo-badge" style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
};

const AccionBadge = ({ accion }) => {
  const CONFIG = {
    crear: { label: "Crear", color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.3)" },
    leer: { label: "Leer", color: "#60a5fa", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.3)" },
    actualizar: { label: "Actualizar", color: "#e9c349", bg: "rgba(233,195,73,0.12)", border: "rgba(233,195,73,0.3)" },
    eliminar: { label: "Eliminar", color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
    login: { label: "Login", color: "#4ade80", bg: "rgba(74,222,128,0.12)", border: "rgba(74,222,128,0.3)" },
    logout: { label: "Logout", color: "#978d9d", bg: "rgba(151,141,157,0.12)", border: "rgba(151,141,157,0.3)" },
    default: { label: accion ?? "—", color: "var(--on-surface-variant)", bg: "rgba(255,255,255,0.05)", border: "var(--outline-variant)" },
  };
  const cfg = CONFIG[accion?.toLowerCase()] ?? CONFIG.default;
  return (
    <span className="audit-accion-badge" style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
};

const AuditLogPage = () => {
   const { isAuthenticated, isSessionChecked } = useAuth();
   const [logs, setLogs] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [acciones, setAcciones] = useState([]);
  const [cargando, setCargando] = useState(false);

  const HOY = new Date().toISOString().split("T")[0];

  const [filtros, setFiltros] = useState({
    fechaInicio: "",
    fechaFin: "",
    usuarioId: "",
    modulo: "",
    accion: "",
  });

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [logsData, usuariosData, modulosData, accionesData] = await Promise.all([
        auditService.obtenerLogs(filtros),
        auditService.obtenerUsuarios(),
        auditService.obtenerModulos(),
        auditService.obtenerAcciones(),
      ]);
      setLogs(logsData);
      setUsuarios(usuariosData);
      setModulos(modulosData.length > 0 ? modulosData : Object.keys({
        pedidos: true, inventario: true, clientes: true, proveedores: true,
        contabilidad: true, usuarios: true, auth: true,
      }));
      setAcciones(accionesData.length > 0 ? accionesData : Object.keys({
        crear: true, leer: true, actualizar: true, eliminar: true, login: true, logout: true,
      }));
    } catch (err) {
      toast.error("Error al cargar audit log: " + (err?.message || "desconocido"));
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => { void cargarDatos(); }, 0);
    return () => window.clearTimeout(id);
  }, [cargarDatos, isSessionChecked, isAuthenticated]);

  const logsMapeados = useMemo(() => {
    return logs.map((log) => ({
      ...log,
      usuarioNombre: log.usuario?.nombreCompleto ?? log.usuario?.usuario ?? `Usuario ${log.usuarioId ?? ""}`,
      fechaFormateada: formatFechaHora(log.fecha),
      fechaRelativa: formatRelativo(log.fecha),
      detalleCorto: truncar(log.detalle, 60),
    }));
  }, [logs]);

  const columnas = [
    { campo: "fechaFormateada", label: "Fecha y Hora", tipo: "texto" },
    { campo: "usuarioNombre", label: "Usuario", tipo: "texto" },
    { campo: "modulo", label: "Módulo", tipo: "texto", renderCeldaCustom: (fila) => <ModuloBadge modulo={fila.modulo} /> },
    { campo: "accion", label: "Acción", tipo: "texto", renderCeldaCustom: (fila) => <AccionBadge accion={fila.accion} /> },
    { campo: "entidadId", label: "Entidad ID", tipo: "texto" },
    { campo: "detalleCorto", label: "Detalle/Observaciones", tipo: "texto" },
  ];

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: "",
      fechaFin: "",
      usuarioId: "",
      modulo: "",
      accion: "",
    });
  };

  const totalLogs = logs.length;
  const logsHoy = logs.filter((l) => l.fecha?.startsWith(HOY)).length;

  return (
    <div className="audit-page">
      <div className="audit-page__header">
        <div>
          <h1 className="audit-page__title">Audit Log</h1>
          <p className="audit-subtitulo">Historial de acciones del sistema</p>
        </div>
        <div className="audit-stats">
          <div className="audit-stat-card">
            <span className="material-symbols-outlined">history</span>
            <div>
              <span className="audit-stat-valor">{totalLogs}</span>
              <span className="audit-stat-label">Total registros</span>
            </div>
          </div>
          <div className="audit-stat-card audit-stat-card--today">
            <span className="material-symbols-outlined">today</span>
            <div>
              <span className="audit-stat-valor">{logsHoy}</span>
              <span className="audit-stat-label">Registros hoy</span>
            </div>
          </div>
        </div>
      </div>

      <div className="audit-filters">
        <div className="filter-group">
          <label htmlFor="audit-fecha-inicio">Desde</label>
          <input
            id="audit-fecha-inicio"
            name="fechaInicio"
            type="date"
            value={filtros.fechaInicio}
            max={filtros.fechaFin || HOY}
            onChange={handleFiltroChange}
            className="filter-select"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="audit-fecha-fin">Hasta</label>
          <input
            id="audit-fecha-fin"
            name="fechaFin"
            type="date"
            value={filtros.fechaFin}
            min={filtros.fechaInicio}
            max={HOY}
            onChange={handleFiltroChange}
            className="filter-select"
          />
        </div>
        <div className="filter-group">
          <label htmlFor="audit-usuario">Usuario</label>
          <select
            id="audit-usuario"
            name="usuarioId"
            value={filtros.usuarioId}
            onChange={handleFiltroChange}
            className="filter-select"
          >
            <option value="">Todos los usuarios</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombreCompleto || u.usuario}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="audit-modulo">Módulo</label>
          <select
            id="audit-modulo"
            name="modulo"
            value={filtros.modulo}
            onChange={handleFiltroChange}
            className="filter-select"
          >
            <option value="">Todos los módulos</option>
            {modulos.map((m) => (
              <option key={m} value={m}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="audit-accion">Acción</label>
          <select
            id="audit-accion"
            name="accion"
            value={filtros.accion}
            onChange={handleFiltroChange}
            className="filter-select"
          >
            <option value="">Todas las acciones</option>
            {acciones.map((a) => (
              <option key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn-outline"
          onClick={limpiarFiltros}
        >
          <span className="material-symbols-outlined">clear_all</span>
          Limpiar
        </button>
      </div>

      <div className="audit-tab-body">
        {cargando ? (
          <Spinner />
        ) : logs.length === 0 ? (
          <EmptyState
            icono="history_edu"
            titulo="No hay registros en el historial"
            detalle="Ajusta los filtros o espera a que se registren nuevas acciones."
          />
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={logsMapeados}
            buscarEnCampos={["usuarioNombre", "entidadId", "detalle"]}
            filasPorPagina={15}
            paginacion
          />
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;