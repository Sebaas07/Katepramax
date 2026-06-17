import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import reporteService from "@/services/reporte.service";
import { formatCOP, formatFecha, getSemanaISO, getRangoSemana } from "@/utils/formatters";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import "./ReportesPage.css";

// ─── Sedes ──────────────────────────────────────────────────────
const SEDES = [
  { id: 1, nombre: "Bogota"        },
  { id: 2, nombre: "Cartagena"     },
  { id: 3, nombre: "Villavicencio" },
];

// ─── Tabs ───────────────────────────────────────────────────────
const TABS = [
  { key: "resumen",   label: "Resumen General",      icon: "dashboard"          },
  { key: "ventas",    label: "Ventas por Período",   icon: "trending_up"        },
  { key: "corte",     label: "Corte de Caja",        icon: "point_of_sale"      },
  { key: "cobros",    label: "Cobros por Entregador", icon: "delivery_dining"   },
  { key: "stock",     label: "Stock Bajo",           icon: "inventory_2"        },
  { key: "deuda",     label: "Clientes con Deuda",   icon: "account_balance"    },
];

// ─── Colores gráficas ───────────────────────────────────────────
const CHART_COLORS = [
  "#e9c349", "#4ade80", "#ddb7ff", "#ffb4ab", "#60a5fa", "#f97316",
];

// ───────────────────────────────────────────────────────────────
const ReportesPage = () => {
  const { usuario, esAdmin } = useAuth();
  const sedeIdUsuario = usuario?.sedeId ?? null;

  // ── Estado general ───────────────────────────────────────────
  const [tab, setTab]           = useState("resumen");
  const [cargando, setCargando] = useState(false);

  // ── Filtros ─────────────────────────────────────────────────
  const HOY = new Date().toISOString().split("T")[0];
  const SEM_ACTUAL = getSemanaISO(new Date());
  const [filtroSedeId, setFiltroSedeId]         = useState(sedeIdUsuario ? String(sedeIdUsuario) : "");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState(() => {
    const r = getRangoSemana(SEM_ACTUAL);
    return r.inicio;
  });
  const [filtroFechaFin, setFiltroFechaFin]     = useState(() => {
    const r = getRangoSemana(SEM_ACTUAL);
    return r.fin;
  });

  // ── Datos por tab ───────────────────────────────────────────
  const [resumen, setResumen]             = useState(null);
  const [ventas, setVentas]               = useState(null);
  const [corte, setCorte]                 = useState(null);
  const [cobros, setCobros]               = useState(null);
  const [stockBajo, setStockBajo]         = useState([]);
  const [deuda, setDeuda]                 = useState(null);

  // ── Carga de datos ──────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const sede = filtroSedeId ? parseInt(filtroSedeId, 10) : undefined;

      if (tab === "resumen") {
        const data = await reporteService.obtenerResumenGeneral({
          sedeId: sede,
          fechaInicio: filtroFechaInicio || undefined,
          fechaFin: filtroFechaFin || undefined,
        });
        setResumen(data);
      } else if (tab === "ventas") {
        const data = await reporteService.obtenerVentasPorPeriodo({
          sedeId: sede,
          fechaInicio: filtroFechaInicio || undefined,
          fechaFin: filtroFechaFin || undefined,
        });
        setVentas(data);
      } else if (tab === "corte") {
        const data = await reporteService.obtenerCorteCaja({
          sedeId: sede,
          fecha: HOY,
        });
        setCorte(data);
      } else if (tab === "cobros") {
        const data = await reporteService.obtenerCobrosEntregador({
          sedeId: sede,
          fechaInicio: filtroFechaInicio || undefined,
          fechaFin: filtroFechaFin || undefined,
        });
        setCobros(data);
      } else if (tab === "stock") {
        const data = await reporteService.obtenerStockBajo({ sedeId: sede });
        setStockBajo(data);
      } else if (tab === "deuda") {
        const data = await reporteService.obtenerDeudaClientes({ sedeId: sede });
        setDeuda(data);
      }
    } catch (err) {
      toast.error("Error al cargar reportes: " + (err?.message || "desconocido"));
    } finally {
      setCargando(false);
    }
  }, [tab, filtroSedeId, filtroFechaInicio, filtroFechaFin, HOY]);

  useEffect(() => {
    const id = window.setTimeout(() => { void cargarDatos(); }, 0);
    return () => window.clearTimeout(id);
  }, [cargarDatos]);

  // ── Handlers exportar (placeholder) ─────────────────────────
  const handleExportar = useCallback((tipo) => {
    toast.success(`Exportación ${tipo} iniciada (próximamente)`);
  }, []);

  // ── Datos mapeados para gráficas ─────────────────────────────
  const tendenciaChartData = useMemo(() => {
    if (!resumen?.tendencia) return [];
    return resumen.tendencia.map((t) => ({
      fecha: t.fecha ? new Date(t.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }) : "—",
      Ingresos: Number(t.ingresos ?? t.ingreso ?? 0),
      Egresos:  Number(t.egresos  ?? t.egreso  ?? 0),
    }));
  }, [resumen]);

  const porSedeChartData = useMemo(() => {
    const fuente = resumen?.porSede ?? ventas?.porSede ?? [];
    return fuente.map((s) => ({
      sede: s.sede?.nombre ?? `Sede ${s.sedeId}`,
      Ingresos: Number(s.ingresos ?? s.total ?? 0),
      Egresos:  Number(s.egresos  ?? 0),
    }));
  }, [resumen, ventas]);

  const metodosPagoData = useMemo(() => {
    const ing = resumen?.kpis?.ingresosPorMetodo ?? ventas?.resumen?.ingresosPorMetodo ?? {};
    return Object.entries(ing).map(([metodo, valor]) => ({
      metodo,
      valor: Number(valor ?? 0),
    }));
  }, [resumen, ventas]);

  const cobrosEntregadorData = useMemo(() => {
    if (!cobros?.detalle) return [];
    return cobros.detalle.map((c) => ({
      nombre: c.entregador?.nombreCompleto ?? c.entregador ?? `Entregador ${c.entregadorId}`,
      total: Number(c.total ?? c.valorTotal ?? 0),
    }));
  }, [cobros]);

  const stockBajoData = useMemo(() => {
    if (!stockBajo.length) return [];
    return stockBajo.map((p) => ({
      ...p,
      stockBajo: p.stockActual <= p.stockMinimo,
    }));
  }, [stockBajo]);

  // ── Filtros comunes ─────────────────────────────────────────
  const mostrarFiltrosFecha = ["resumen", "ventas", "cobros"].includes(tab);

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
      {mostrarFiltrosFecha && (
        <>
          <div className="filter-group">
            <label htmlFor="rep-fecha-inicio">Desde</label>
            <input
              id="rep-fecha-inicio"
              type="date"
              value={filtroFechaInicio}
              max={filtroFechaFin || HOY}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              className="filter-select"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="rep-fecha-fin">Hasta</label>
            <input
              id="rep-fecha-fin"
              type="date"
              value={filtroFechaFin}
              min={filtroFechaInicio}
              max={HOY}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              className="filter-select"
            />
          </div>
        </>
      )}
      <button
        type="button"
        className="btn-outline"
        onClick={() => handleExportar(tab)}
      >
        <span className="material-symbols-outlined">download</span>
        Exportar
      </button>
    </div>
  );

  // ── Render tab: Resumen General ─────────────────────────────
  const renderResumen = () => {
    const kpis = resumen?.kpis;
    if (!kpis) {
      return <EmptyState icono="dashboard" titulo="Sin datos de resumen" detalle="Ajusta los filtros e intenta de nuevo." />;
    }

    const ing = Number(kpis.ingresos ?? kpis.ventas ?? 0);
    const egr = Number(kpis.egresos ?? 0);
    const saldoNeto = ing - egr;

    return (
      <div className="rep-tab-body">
        <div className="rep-kpis">
          <div className="rep-kpi-card" style={{ "--kpi-color": "#4ade80" }}>
            <div className="rep-kpi-card__icon">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div className="rep-kpi-card__body">
              <div className="rep-kpi-card__titulo">Ingresos</div>
              <div className="rep-kpi-card__valor">{formatCOP(ing)}</div>
              <div className="rep-kpi-card__sub">Período seleccionado</div>
            </div>
          </div>
          <div className="rep-kpi-card" style={{ "--kpi-color": "var(--error)" }}>
            <div className="rep-kpi-card__icon">
              <span className="material-symbols-outlined">trending_down</span>
            </div>
            <div className="rep-kpi-card__body">
              <div className="rep-kpi-card__titulo">Egresos</div>
              <div className="rep-kpi-card__valor">{formatCOP(egr)}</div>
              <div className="rep-kpi-card__sub">Operativos del período</div>
            </div>
          </div>
          <div className="rep-kpi-card" style={{ "--kpi-color": saldoNeto >= 0 ? "#4ade80" : "var(--error)" }}>
            <div className="rep-kpi-card__icon">
              <span className="material-symbols-outlined">account_balance_wallet</span>
            </div>
            <div className="rep-kpi-card__body">
              <div className="rep-kpi-card__titulo">Saldo neto</div>
              <div className="rep-kpi-card__valor">{formatCOP(saldoNeto)}</div>
              <div className="rep-kpi-card__sub">Ingresos - egresos</div>
            </div>
          </div>
          <div className="rep-kpi-card" style={{ "--kpi-color": "var(--primary)" }}>
            <div className="rep-kpi-card__icon">
              <span className="material-symbols-outlined">shopping_cart</span>
            </div>
            <div className="rep-kpi-card__body">
              <div className="rep-kpi-card__titulo">Pedidos</div>
              <div className="rep-kpi-card__valor">{kpis.pedidos ?? kpis.totalPedidos ?? 0}</div>
              <div className="rep-kpi-card__sub">Registrados en el período</div>
            </div>
          </div>
        </div>

        {tendenciaChartData.length > 0 && (
          <div className="rep-charts-grid">
            <div className="rep-section">
              <h3 className="rep-section__title">
                <span className="material-symbols-outlined">show_chart</span>
                Tendencia de ingresos y egresos
              </h3>
              <div className="rep-chart-wrap" style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={tendenciaChartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCOP(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="Ingresos" stroke="var(--secondary)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Egresos"  stroke="var(--error)"     strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {porSedeChartData.length > 0 && (
          <div className="rep-section">
            <h3 className="rep-section__title">
              <span className="material-symbols-outlined">store</span>
              Consolidado por sede
            </h3>
            <div className="rep-chart-wrap" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porSedeChartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                  <XAxis dataKey="sede" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCOP(value)} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Egresos"  fill="var(--error)"     radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {metodosPagoData.length > 0 && (
          <div className="rep-section">
            <h3 className="rep-section__title">
              <span className="material-symbols-outlined">payments</span>
              Ingresos por método de pago
            </h3>
            <div className="rep-chart-wrap" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metodosPagoData}
                    dataKey="valor"
                    nameKey="metodo"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ metodo, valor }) => `${metodo}: ${formatCOP(valor)}`}
                  >
                    {metodosPagoData.map((entry, idx) => (
                      <Cell key={entry.metodo} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCOP(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Render tab: Ventas por Período ──────────────────────────
  const renderVentas = () => {
    const detalle = ventas?.detalle ?? [];
    const resumenV = ventas?.resumen;

    return (
      <div className="rep-tab-body">
        {resumenV && (
          <div className="rep-kpis">
            <div className="rep-kpi-card" style={{ "--kpi-color": "#4ade80" }}>
              <div className="rep-kpi-card__icon">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div className="rep-kpi-card__body">
                <div className="rep-kpi-card__titulo">Total ventas</div>
                <div className="rep-kpi-card__valor">{formatCOP(resumenV.total ?? resumenV.totalVentas ?? 0)}</div>
                <div className="rep-kpi-card__sub">{detalle.length} registros</div>
              </div>
            </div>
            <div className="rep-kpi-card" style={{ "--kpi-color": "#ddb7ff" }}>
              <div className="rep-kpi-card__icon">
                <span className="material-symbols-outlined">shopping_cart</span>
              </div>
              <div className="rep-kpi-card__body">
                <div className="rep-kpi-card__titulo">Pedidos</div>
                <div className="rep-kpi-card__valor">{resumenV.pedidos ?? detalle.length}</div>
                <div className="rep-kpi-card__sub">En el período</div>
              </div>
            </div>
            <div className="rep-kpi-card" style={{ "--kpi-color": "var(--aged-gold)" }}>
              <div className="rep-kpi-card__icon">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div className="rep-kpi-card__body">
                <div className="rep-kpi-card__titulo">Ticket promedio</div>
                <div className="rep-kpi-card__valor">{formatCOP(resumenV.ticketPromedio ?? 0)}</div>
              </div>
            </div>
          </div>
        )}

        {porSedeChartData.length > 0 && (
          <div className="rep-section">
            <h3 className="rep-section__title">
              <span className="material-symbols-outlined">bar_chart</span>
              Ventas por sede
            </h3>
            <div className="rep-chart-wrap" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porSedeChartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                  <XAxis dataKey="sede" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCOP(value)} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div className="rep-tabla-wrap">
          <TablaGenerica
            columnas={[
              { campo: "id",          label: "#",              tipo: "numero" },
              { campo: "fecha",       label: "Fecha",          tipo: "fecha"  },
              { campo: "cliente",     label: "Cliente",        tipo: "texto"  },
              { campo: "sede",        label: "Sede",           tipo: "texto"  },
              { campo: "total",       label: "Total",          tipo: "moneda" },
              { campo: "metodoPago",  label: "Método",         tipo: "texto"  },
              { campo: "estado",      label: "Estado",         tipo: "estado" },
            ]}
            datos={detalle}
            buscarEnCampos={["cliente", "sede", "estado"]}
          />
        </div>
      </div>
    );
  };

  // ── Render tab: Corte de Caja ───────────────────────────────
  const renderCorte = () => {
    const movimientos = corte?.movimientos ?? [];
    const resumenC = corte?.resumen;

    return (
      <div className="rep-tab-body">
        {resumenC && (
          <div className="rep-kpis">
            <div className="rep-kpi-card" style={{ "--kpi-color": "#4ade80" }}>
              <div className="rep-kpi-card__icon">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div className="rep-kpi-card__body">
                <div className="rep-kpi-card__titulo">Efectivo en caja</div>
                <div className="rep-kpi-card__valor">{formatCOP(resumenC.efectivo ?? resumenC.totalEfectivo ?? 0)}</div>
              </div>
            </div>
            <div className="rep-kpi-card" style={{ "--kpi-color": "var(--aged-gold)" }}>
              <div className="rep-kpi-card__icon">
                <span className="material-symbols-outlined">account_balance</span>
              </div>
              <div className="rep-kpi-card__body">
                <div className="rep-kpi-card__titulo">Cuentas por cobrar</div>
                <div className="rep-kpi-card__valor">{formatCOP(resumenC.cuentas ?? resumenC.totalCuentas ?? 0)}</div>
              </div>
            </div>
            <div className="rep-kpi-card" style={{ "--kpi-color": "var(--secondary)" }}>
              <div className="rep-kpi-card__icon">
                <span className="material-symbols-outlined">summarize</span>
              </div>
              <div className="rep-kpi-card__body">
                <div className="rep-kpi-card__titulo">Total del día</div>
                <div className="rep-kpi-card__valor">{formatCOP(resumenC.total ?? (Number(resumenC.efectivo ?? 0) + Number(resumenC.cuentas ?? 0)))}</div>
              </div>
            </div>
          </div>
        )}

        <div className="rep-tabla-wrap">
          <TablaGenerica
            columnas={[
              { campo: "hora",        label: "Hora",           tipo: "texto"   },
              { campo: "concepto",    label: "Concepto",       tipo: "texto"   },
              { campo: "tipo",        label: "Tipo",           tipo: "texto"   },
              { campo: "efectivo",    label: "Efectivo",       tipo: "moneda"  },
              { campo: "cuentas",     label: "Cuentas",        tipo: "moneda"  },
              { campo: "total",       label: "Total",          tipo: "moneda"  },
              { campo: "usuario",     label: "Usuario",        tipo: "texto"   },
            ]}
            datos={movimientos}
            buscarEnCampos={["concepto", "tipo", "usuario"]}
          />
        </div>
      </div>
    );
  };

  // ── Render tab: Cobros por Entregador ───────────────────────
  const renderCobros = () => {
    const detalleC = cobros?.detalle ?? [];

    return (
      <div className="rep-tab-body">
        {cobrosEntregadorData.length > 0 && (
          <div className="rep-section">
            <h3 className="rep-section__title">
              <span className="material-symbols-outlined">bar_chart</span>
              Cobros por entregador
            </h3>
            <div className="rep-chart-wrap" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cobrosEntregadorData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                  <XAxis dataKey="nombre" />
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
              { campo: "entregador",  label: "Entregador",       tipo: "texto"  },
              { campo: "pedidos",     label: "Pedidos",          tipo: "numero" },
              { campo: "total",       label: "Total cobrado",    tipo: "moneda" },
              { campo: "efectivo",    label: "Efectivo",         tipo: "moneda" },
              { campo: "cuentas",     label: "Cuentas",          tipo: "moneda" },
            ]}
            datos={detalleC}
            buscarEnCampos={["entregador"]}
          />
        </div>
      </div>
    );
  };

  // ── Render tab: Stock Bajo ──────────────────────────────────
  const renderStock = () => {
    const datos = stockBajoData;

    return (
      <div className="rep-tab-body">
        {datos.length === 0 ? (
          <EmptyState icono="inventory_2" titulo="Sin productos con stock bajo" detalle="Todos los productos tienen inventario suficiente." />
        ) : (
          <div className="rep-tabla-wrap">
            <TablaGenerica
              columnas={[
                { campo: "codigo",       label: "Código",      tipo: "texto"  },
                { campo: "nombre",       label: "Producto",    tipo: "texto"  },
                { campo: "sede",         label: "Sede",        tipo: "texto"  },
                { campo: "stockActual",  label: "Stock actual", tipo: "numero" },
                { campo: "stockMinimo",  label: "Stock mínimo", tipo: "numero" },
                { campo: "diferencia",   label: "Diferencia",  tipo: "texto", renderCeldaCustom: (fila) => {
                  const diff = Number(fila.stockActual ?? 0) - Number(fila.stockMinimo ?? 0);
                  return <span className={diff <= 0 ? "stock-bajo-badge" : "stock-normal-badge"}>{diff}</span>;
                }},
                { campo: "estadoStock",  label: "Estado",      tipo: "texto", renderCeldaCustom: (fila) => {
                  const esBajo = Number(fila.stockActual ?? 0) <= Number(fila.stockMinimo ?? 0);
                  return esBajo
                    ? <span className="stock-bajo-badge">Bajo</span>
                    : <span className="stock-normal-badge">Normal</span>;
                }},
              ]}
              datos={datos}
              buscarEnCampos={["codigo", "nombre", "sede"]}
            />
          </div>
        )}
      </div>
    );
  };

  // ── Render tab: Clientes con Deuda ──────────────────────────
  const renderDeuda = () => {
    const detalleD = deuda?.detalle ?? [];
    const resumenD = deuda?.resumen;

    return (
      <div className="rep-tab-body">
        {resumenD && (
          <div className="rep-kpis">
            <div className="rep-kpi-card" style={{ "--kpi-color": "var(--primary)" }}>
              <div className="rep-kpi-card__icon">
                <span className="material-symbols-outlined">account_balance</span>
              </div>
              <div className="rep-kpi-card__body">
                <div className="rep-kpi-card__titulo">Deuda total</div>
                <div className="rep-kpi-card__valor">{formatCOP(resumenD.totalDeuda ?? resumenD.total ?? 0)}</div>
              </div>
            </div>
            <div className="rep-kpi-card" style={{ "--kpi-color": "#4ade80" }}>
              <div className="rep-kpi-card__icon">
                <span className="material-symbols-outlined">people</span>
              </div>
              <div className="rep-kpi-card__body">
                <div className="rep-kpi-card__titulo">Clientes con deuda</div>
                <div className="rep-kpi-card__valor">{resumenD.clientesConDeuda ?? detalleD.length}</div>
              </div>
            </div>
          </div>
        )}

        <div className="rep-tabla-wrap">
          <TablaGenerica
            columnas={[
              { campo: "cliente",       label: "Cliente",        tipo: "texto"  },
              { campo: "documento",     label: "Documento",      tipo: "texto"  },
              { campo: "sede",          label: "Sede",           tipo: "texto"  },
              { campo: "saldoPendiente", label: "Saldo pendiente", tipo: "moneda" },
              { campo: "ultimoPago",    label: "Último pago",    tipo: "fecha"  },
              { campo: "diasMora",      label: "Días de mora",   tipo: "numero" },
            ]}
            datos={detalleD}
            buscarEnCampos={["cliente", "documento", "sede"]}
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
            {tab === "corte"
              ? formatFecha(HOY)
              : `${formatFecha(filtroFechaInicio)} — ${formatFecha(filtroFechaFin)}`}
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
          {tab === "resumen" && renderResumen()}
          {tab === "ventas"  && renderVentas()}
          {tab === "corte"   && renderCorte()}
          {tab === "cobros"  && renderCobros()}
          {tab === "stock"   && renderStock()}
          {tab === "deuda"   && renderDeuda()}
        </>
      )}
    </div>
  );
};

export default ReportesPage;
