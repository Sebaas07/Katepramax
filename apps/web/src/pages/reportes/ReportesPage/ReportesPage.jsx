import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import reporteService from "@/services/reporte.service";
import contabilidadService from "@/services/contabilidad.service";
import {
  formatCOP,
  formatFecha,
  getSemanaISO,
  getRangoSemana,
} from "@/utils/formatters";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import "./ReportesPage.css";

// ─── Sedes ──────────────────────────────────────────────────────
const SEDES = [
  { id: 1, nombre: "Bogota" },
  { id: 2, nombre: "Cartagena" },
  { id: 3, nombre: "Villavicencio" },
];

// ─── Tabs ───────────────────────────────────────────────────────
// Solo dos reportes reales: cobros por entregador (AsignacionEntrega)
// y gastos diarios (reutiliza los endpoints de Egresos ya existentes).
const TABS = [
  { key: "cobros", label: "Cobros por Entregador", icon: "delivery_dining" },
  { key: "gastos", label: "Gastos Diarios",        icon: "point_of_sale"   },
];

const HOY = new Date().toISOString().split("T")[0];
const SEM_ACTUAL = getSemanaISO(new Date());

const EmptyState = ({ icono, titulo, detalle }) => (
  <div className="rep-empty">
    <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
    <p>{titulo}</p>
    {detalle && <span>{detalle}</span>}
  </div>
);

const toNumber = (v) => Number(v ?? 0);

// ───────────────────────────────────────────────────────────────
const ReportesPage = () => {
  const { usuario, esAdmin, isAuthenticated, isSessionChecked } = useAuth();
  const sedeIdUsuario = usuario?.sedeId ?? null;

  const [tab, setTab] = useState("cobros");
  const [cargando, setCargando] = useState(false);

  const [filtroSedeId, setFiltroSedeId] = useState(
    sedeIdUsuario ? String(sedeIdUsuario) : "",
  );

  // Filtros de "Cobros por Entregador" (rango de fechas)
  const [fechaInicio, setFechaInicio] = useState(() => getRangoSemana(SEM_ACTUAL).inicio);
  const [fechaFin, setFechaFin] = useState(() => getRangoSemana(SEM_ACTUAL).fin);

  // Filtro de "Gastos Diarios" (semana, igual que en Contabilidad)
  const [filtroSemana, setFiltroSemana] = useState(SEM_ACTUAL);

  // ── Datos ─────────────────────────────────────────────────────
  const [cobros, setCobros] = useState(null);
  const [gastosDia, setGastosDia] = useState([]);
  const [gastosConcepto, setGastosConcepto] = useState([]);
  const [gastosLista, setGastosLista] = useState([]);

  // ── Carga de datos ──────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      if (tab === "cobros") {
        const sede = esAdmin ? (filtroSedeId ? parseInt(filtroSedeId, 10) : undefined) : undefined;
        const data = await reporteService.obtenerCobrosEntregador({
          fechaInicio,
          fechaFin,
          sedeId: sede,
        });
        setCobros(data);
      } else if (tab === "gastos") {
        const semanaNum = parseInt(filtroSemana, 10) || SEM_ACTUAL;
        const [totalesDia, resumenConcepto, lista] = await Promise.all([
          contabilidadService.obtenerTotalesDiaEgresos(semanaNum),
          contabilidadService.obtenerResumenConceptoEgresos(semanaNum),
          contabilidadService.obtenerEgresos({
            semana: semanaNum,
            sedeId: filtroSedeId || undefined,
          }),
        ]);
        setGastosDia(Array.isArray(totalesDia) ? totalesDia : []);
        setGastosConcepto(Array.isArray(resumenConcepto) ? resumenConcepto : []);
        setGastosLista(Array.isArray(lista) ? lista : []);
      }
    } catch (err) {
      toast.error("Error al cargar el reporte: " + (err?.message || "desconocido"));
    } finally {
      setCargando(false);
    }
  }, [tab, esAdmin, filtroSedeId, fechaInicio, fechaFin, filtroSemana]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => { void cargarDatos(); }, 0);
    return () => window.clearTimeout(id);
  }, [cargarDatos, isSessionChecked, isAuthenticated]);

  // ── Datos mapeados ───────────────────────────────────────────
  const cobrosChartData = useMemo(() => {
    if (!cobros?.detalle) return [];
    return cobros.detalle.map((c) => ({
      entregador: c.entregador,
      total: toNumber(c.total),
    }));
  }, [cobros]);

  const gastosDiaChartData = useMemo(
    () =>
      (gastosDia ?? []).map((g) => ({
        fecha: g.fecha ? formatFecha(g.fecha) : "—",
        Gastos: toNumber(g._sum?.total ?? g.total),
      })),
    [gastosDia],
  );

  const gastosListaMapeada = useMemo(
    () =>
      (gastosLista ?? []).map((g) => ({
        ...g,
        sede: g.sede?.nombre ?? `Sede ${g.sedeId}`,
      })),
    [gastosLista],
  );

  const totalGastosSemana = useMemo(
    () => gastosListaMapeada.reduce((t, g) => t + toNumber(g.total), 0),
    [gastosListaMapeada],
  );

  // ── Filtros comunes ──────────────────────────────────────────
  const filtrosComunes = (
    <div className="rep-page__acciones">
      {esAdmin && (
        <div className="filter-group">
          <label htmlFor="rep-sede">Sede</label>
          <select
            id="rep-sede"
            value={filtroSedeId}
            onChange={(e) => setFiltroSedeId(e.target.value)}
            className="filter-select"
          >
            <option value="">Todas</option>
            {SEDES.map((s) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {tab === "cobros" && (
        <>
          <div className="filter-group">
            <label htmlFor="rep-fecha-inicio">Desde</label>
            <input
              id="rep-fecha-inicio"
              type="date"
              value={fechaInicio}
              max={fechaFin || HOY}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="filter-select"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="rep-fecha-fin">Hasta</label>
            <input
              id="rep-fecha-fin"
              type="date"
              value={fechaFin}
              min={fechaInicio}
              max={HOY}
              onChange={(e) => setFechaFin(e.target.value)}
              className="filter-select"
            />
          </div>
        </>
      )}

      {tab === "gastos" && (
        <div className="filter-group">
          <label htmlFor="rep-semana">Semana</label>
          <input
            id="rep-semana"
            type="number"
            min={1}
            max={53}
            value={filtroSemana}
            onChange={(e) => setFiltroSemana(e.target.value)}
            className="filter-select"
          />
        </div>
      )}
    </div>
  );

  // ── Render tab: Cobros por Entregador ─────────────────────────
  const renderCobros = () => {
    const detalle = cobros?.detalle ?? [];

    if (!cargando && detalle.length === 0) {
      return (
        <EmptyState
          icono="delivery_dining"
          titulo="Sin cobros registrados en este rango de fechas."
          detalle="Ajusta las fechas o verifica que existan entregas confirmadas."
        />
      );
    }

    return (
      <div className="rep-tab-body">
        <div className="rep-kpis">
          <div className="rep-kpi-card" style={{ "--kpi-color": "#4ade80" }}>
            <div className="rep-kpi-card__icon">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div className="rep-kpi-card__body">
              <div className="rep-kpi-card__titulo">Total cobrado</div>
              <div className="rep-kpi-card__valor">{formatCOP(cobros?.total ?? 0)}</div>
              <div className="rep-kpi-card__sub">
                {formatFecha(fechaInicio)} — {formatFecha(fechaFin)}
              </div>
            </div>
          </div>
          <div className="rep-kpi-card" style={{ "--kpi-color": "var(--primary)" }}>
            <div className="rep-kpi-card__icon">
              <span className="material-symbols-outlined">local_shipping</span>
            </div>
            <div className="rep-kpi-card__body">
              <div className="rep-kpi-card__titulo">Entregas confirmadas</div>
              <div className="rep-kpi-card__valor">{cobros?.pedidos ?? 0}</div>
            </div>
          </div>
        </div>

        {cobrosChartData.length > 0 && (
          <div className="rep-section">
            <h3 className="rep-section__title">
              <span className="material-symbols-outlined">bar_chart</span>
              Cobros por entregador
            </h3>
            <div className="rep-chart-wrap" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cobrosChartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                  <XAxis dataKey="entregador" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCOP(value)} />
                  <Legend />
                  <Bar dataKey="total" name="Total cobrado" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="rep-tabla-wrap">
          <TablaGenerica
            columnas={[
              { campo: "entregador", label: "Entregador",    tipo: "texto"  },
              { campo: "pedidos",    label: "Entregas",      tipo: "numero" },
              { campo: "total",      label: "Total cobrado", tipo: "moneda" },
              { campo: "efectivo",   label: "Efectivo",      tipo: "moneda" },
              { campo: "cuentas",    label: "Transferencia", tipo: "moneda" },
            ]}
            datos={detalle}
            mostrarBuscador
            buscarEnCampos={["entregador"]}
          />
        </div>
      </div>
    );
  };

  // ── Render tab: Gastos Diarios ─────────────────────────────────
  const renderGastos = () => {
    if (!cargando && gastosListaMapeada.length === 0) {
      return (
        <EmptyState
          icono="point_of_sale"
          titulo="Sin egresos registrados en esta semana."
          detalle="Registra egresos en Contabilidad para ver el reporte aquí."
        />
      );
    }

    return (
      <div className="rep-tab-body">
        <div className="rep-kpis">
          <div className="rep-kpi-card" style={{ "--kpi-color": "var(--error)" }}>
            <div className="rep-kpi-card__icon">
              <span className="material-symbols-outlined">trending_down</span>
            </div>
            <div className="rep-kpi-card__body">
              <div className="rep-kpi-card__titulo">Total de gastos</div>
              <div className="rep-kpi-card__valor">{formatCOP(totalGastosSemana)}</div>
              <div className="rep-kpi-card__sub">Semana {filtroSemana}</div>
            </div>
          </div>
          <div className="rep-kpi-card" style={{ "--kpi-color": "var(--aged-gold)" }}>
            <div className="rep-kpi-card__icon">
              <span className="material-symbols-outlined">receipt_long</span>
            </div>
            <div className="rep-kpi-card__body">
              <div className="rep-kpi-card__titulo">Registros</div>
              <div className="rep-kpi-card__valor">{gastosListaMapeada.length}</div>
            </div>
          </div>
        </div>

        {gastosDiaChartData.length > 0 && (
          <div className="rep-section">
            <h3 className="rep-section__title">
              <span className="material-symbols-outlined">bar_chart</span>
              Gastos por día
            </h3>
            <div className="rep-chart-wrap" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gastosDiaChartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                  <XAxis dataKey="fecha" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCOP(value)} />
                  <Legend />
                  <Bar dataKey="Gastos" fill="var(--error)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {gastosConcepto.length > 0 && (
          <div className="rep-section">
            <h3 className="rep-section__title">
              <span className="material-symbols-outlined">category</span>
              Gastos por concepto
            </h3>
            <div className="rep-tabla-wrap">
              <TablaGenerica
                columnas={[
                  { campo: "concepto", label: "Concepto", tipo: "texto"  },
                  { campo: "total",    label: "Total",     tipo: "moneda" },
                ]}
                datos={gastosConcepto.map((c) => ({
                  concepto: c.concepto,
                  total: toNumber(c._sum?.total ?? c.total),
                }))}
              />
            </div>
          </div>
        )}

        <div className="rep-tabla-wrap">
          <TablaGenerica
            columnas={[
              { campo: "fecha",       label: "Fecha",    tipo: "fecha"  },
              { campo: "concepto",    label: "Concepto", tipo: "texto"  },
              { campo: "sede",        label: "Sede",     tipo: "texto"  },
              { campo: "total",       label: "Total",    tipo: "moneda" },
              { campo: "observacion", label: "Obs.",     tipo: "texto"  },
            ]}
            datos={gastosListaMapeada}
            mostrarBuscador
            buscarEnCampos={["concepto", "sede", "observacion"]}
            paginacion
          />
        </div>
      </div>
    );
  };

  // ── Render principal ────────────────────────────────────────
  return (
    <div className="rep-page">
      {/* Header */}
      <div className="rep-page__header">
        <div>
          <h1 className="rep-page__title">Reportes</h1>
          <p className="rep-subtitulo">
            {tab === "cobros"
              ? `${formatFecha(fechaInicio)} — ${formatFecha(fechaFin)}`
              : `Semana ${filtroSemana}`}
          </p>
        </div>
        {filtrosComunes}
      </div>

      {/* Tabs */}
      <div className="rep-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`rep-tab-btn ${tab === t.key ? "rep-tab-btn--active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className="material-symbols-outlined">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {cargando ? (
        <div className="rep-spinner-wrap">
          <div className="rep-spinner" />
          <span>Cargando reporte...</span>
        </div>
      ) : (
        <>
          {tab === "cobros" && renderCobros()}
          {tab === "gastos" && renderGastos()}
        </>
      )}
    </div>
  );
};

export default ReportesPage;
