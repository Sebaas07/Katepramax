import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import logsService from "@/services/logs.service";
import usuarioService from "@/services/usuario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import { formatFecha } from "@/utils/formatters";
import "./LogsPage.css";

const TAKE = 50;

const Spinner = () => (
  <div className="logs-spinner-wrap">
    <div className="logs-spinner" />
    <span>Cargando historial...</span>
  </div>
);

const formatFechaHora = (valor) => {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const LogsPage = () => {
  const [cargando, setCargando] = useState(false);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);

  const [usuarios, setUsuarios] = useState([]);
  const [acciones, setAcciones] = useState([]);

  const [filtroUsuarioId, setFiltroUsuarioId] = useState("");
  const [filtroAccion, setFiltroAccion] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");

  // Catálogos para los filtros (una sola vez)
  useEffect(() => {
    usuarioService
      .obtenerUsuarios()
      .then((data) => setUsuarios(Array.isArray(data) ? data : []))
      .catch(() => setUsuarios([]));
    logsService.listarAcciones().then(setAcciones);
  }, []);

  const cargarLogs = useCallback(async () => {
    setCargando(true);
    try {
      const resultado = await logsService.listar({
        usuarioId: filtroUsuarioId || undefined,
        accion: filtroAccion || undefined,
        fechaInicio: filtroFechaInicio || undefined,
        fechaFin: filtroFechaFin || undefined,
        skip,
        take: TAKE,
      });
      setLogs(resultado.data);
      setTotal(resultado.total);
    } catch (err) {
      toast.error(
        "Error al cargar el historial: " + (err?.message || "desconocido"),
      );
    } finally {
      setCargando(false);
    }
  }, [filtroUsuarioId, filtroAccion, filtroFechaInicio, filtroFechaFin, skip]);

  useEffect(() => {
    const id = window.setTimeout(() => { void cargarLogs(); }, 0);
    return () => window.clearTimeout(id);
  }, [cargarLogs]);

  // Al cambiar cualquier filtro, volver a la primera página
  useEffect(() => {
    setSkip(0);
  }, [filtroUsuarioId, filtroAccion, filtroFechaInicio, filtroFechaFin]);

  const logsMapeados = useMemo(
    () =>
      logs.map((l) => ({
        ...l,
        usuarioNombre: l.usuario?.nombreCompleto ?? `Usuario ${l.usuarioId}`,
        rol: l.usuario?.rol ?? "—",
        fechaFormateada: formatFechaHora(l.creadoEn),
      })),
    [logs],
  );

  const paginaActual = Math.floor(skip / TAKE) + 1;
  const totalPaginas = Math.max(1, Math.ceil(total / TAKE));

  return (
    <div className="logs-page">
      <div className="logs-page__header">
        <div>
          <h1 className="logs-page__title">
            <span className="material-symbols-outlined">history</span>
            Historial de Acciones
          </h1>
          <p className="logs-subtitulo">
            Registro de auditoría de todas las acciones realizadas por los
            usuarios en el sistema.
          </p>
        </div>
        <span className="logs-contador">{total} registros</span>
      </div>

      <div className="logs-filtros">
        <div className="filter-group">
          <label htmlFor="logs-usuario">Usuario</label>
          <select
            id="logs-usuario"
            value={filtroUsuarioId}
            onChange={(e) => setFiltroUsuarioId(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombreCompleto || u.usuario}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="logs-accion">Acción</label>
          <select
            id="logs-accion"
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas</option>
            {acciones.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="logs-desde">Desde</label>
          <DatePicker
            id="logs-desde"
            value={filtroFechaInicio}
            max={filtroFechaFin || undefined}
            onChange={(e) => setFiltroFechaInicio(e.target.value)}
            className="filter-select"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="logs-hasta">Hasta</label>
          <DatePicker
            id="logs-hasta"
            value={filtroFechaFin}
            min={filtroFechaInicio || undefined}
            onChange={(e) => setFiltroFechaFin(e.target.value)}
            className="filter-select"
          />
        </div>
      </div>

      {cargando ? (
        <Spinner />
      ) : logsMapeados.length === 0 ? (
        <EmptyState
          icono="history"
          titulo="No hay acciones registradas con estos filtros."
          detalle="Ajusta los filtros o el rango de fechas."
        />
      ) : (
        <>
          <TablaGenerica
            columnas={[
              { campo: "fechaFormateada", label: "Fecha",      tipo: "texto" },
              { campo: "usuarioNombre",   label: "Usuario",    tipo: "texto" },
              { campo: "rol",             label: "Rol",        tipo: "texto" },
              { campo: "accion",          label: "Acción",     tipo: "texto" },
              { campo: "descripcion",     label: "Descripción", tipo: "texto" },
            ]}
            datos={logsMapeados}
            mostrarBuscador
            buscarEnCampos={["usuarioNombre", "accion", "descripcion"]}
          />

          <div className="logs-paginacion">
            <button
              type="button"
              disabled={skip === 0}
              onClick={() => setSkip((s) => Math.max(0, s - TAKE))}
              className="logs-pag-btn"
            >
              <span className="material-symbols-outlined">chevron_left</span>
              Anterior
            </button>
            <span>Página {paginaActual} de {totalPaginas}</span>
            <button
              type="button"
              disabled={skip + TAKE >= total}
              onClick={() => setSkip((s) => s + TAKE)}
              className="logs-pag-btn"
            >
              Siguiente
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LogsPage;
