import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import contabilidadService from "@/services/contabilidad.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  formatCOP, formatFecha, getRangoSemana, getSemanaISO,
} from "@/utils/formatters";
import "./ContabilidadPage.css";

const HOY = new Date().toISOString().split("T")[0];
const SEM_ACTUAL = getSemanaISO(new Date());

const SEDES = [
  { id: 1, nombre: "Bogota" },
  { id: 2, nombre: "Cartagena" },
  { id: 3, nombre: "Villavicencio" },
];

const TABS = [
  { key: "ingresos",   label: "Ingresos Diarios", icon: "trending_up"         },
  { key: "egresos",    label: "Egresos Diarios",  icon: "trending_down"        },
  { key: "cartera",    label: "Cartera",           icon: "account_balance"      },
  { key: "proveedores",label: "Proveedores",       icon: "conveyor_belt"        },
  { key: "panel",      label: "Panel General",     icon: "dashboard"            },
  { key: "arqueo",     label: "Arqueo Semanal",    icon: "summarize"            },
];

// ── Helpers puros ─────────────────────────────────────────────
const toNumber = (v) => Number(v ?? 0);
const getSemanaNumero = (semana) => {
  const n = parseInt(semana, 10);
  return Number.isFinite(n) ? n : SEM_ACTUAL;
};
const rowsDeReporte = (data) => (Array.isArray(data) ? data : data?.porSede ?? []);
const sumar = (filas, campo) => filas.reduce((t, f) => t + toNumber(f?.[campo]), 0);
const mapNombreSede = (items) =>
  items.map((i) => ({
    ...i,
    sede: SEDES.find((s) => s.id === i.sedeId)?.nombre ?? `Sede ${i.sedeId}`,
  }));
const mapProveedorNombre = (items) =>
  items.map((i) => ({
    ...i,
    sede:      i.sede?.nombre ?? SEDES.find((s) => s.id === i.sedeId)?.nombre ?? `Sede ${i.sedeId}`,
    proveedor: i.proveedor?.nombre ?? `Proveedor ${i.proveedorId ?? ""}`.trim(),
  }));
const resumenPorSede = (items, campo) =>
  SEDES.map((s) => ({
    sede:  s.nombre,
    valor: items.filter((i) => i.sedeId === s.id).reduce((sum, i) => sum + toNumber(i[campo]), 0),
  }));
const totalDeSede = (items, campo) => items.reduce((sum, i) => sum + toNumber(i[campo]), 0);

const ESTADOS_DEUDA = {
  al_dia:   { label: "Al dia",   color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  pendiente:{ label: "Pendiente",color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
  vencida:  { label: "Vencida",  color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
};

const estadoDeuda = (prov) => {
  if (!prov) return "pendiente";
  if (prov.deudaVencida || prov.estadoDeuda === "vencida") return "vencida";
  if (toNumber(prov.saldoPendiente ?? prov.valorPagado) > 0) return "pendiente";
  return "al_dia";
};

const etiquetaEgreso = (concepto) => {
  if (!concepto) return null;
  const c = concepto.toLowerCase();
  if (c.includes("proveedor") || c.includes("pollo") || c.includes("insumo") || c.includes("mercado"))
    return { label: "Proveedores", color: "#e9c349" };
  if (c.includes("arriendo") || c.includes("servicio") || c.includes("nomina") || c.includes("sueldo"))
    return { label: "Operativo", color: "#60a5fa" };
  return { label: "General", color: "#c4b5fd" };
};

// ── Subcomponentes ────────────────────────────────────────────
const Spinner = ({ texto = "Cargando..." }) => (
  <div className="cont-spinner-wrap">
    <div className="cont-spinner" />
    <span>{texto}</span>
  </div>
);

const EmptyState = ({ icono, titulo, detalle }) => (
  <div className="cont-empty">
    <span className="material-symbols-outlined">{icono}</span>
    <p>{titulo}</p>
    {detalle && <span className="cont-empty__hint">{detalle}</span>}
  </div>
);

const TarjetaResumen = ({ titulo, icono, color, filas, total }) => (
  <div className="cont-resumen-card" style={{ "--card-accent": color }}>
    <div className="cont-resumen-card__header">
      <span className="material-symbols-outlined">{icono}</span>
      <h4>{titulo}</h4>
    </div>
    <div className="cont-resumen-card__filas">
      {filas.map((f, i) => (
        <div key={i} className="cont-resumen-card__fila">
          <span>{f.sede}</span>
          <strong>{formatCOP(f.valor)}</strong>
        </div>
      ))}
    </div>
    <div className="cont-resumen-card__total">
      <span>Total semana</span>
      <span>{formatCOP(total)}</span>
    </div>
  </div>
);

const TarjetaResumenProveedor = ({ titulo, icono, color, filas, total }) => (
  <div className="cont-resumen-card" style={{ "--card-accent": color }}>
    <div className="cont-resumen-card__header">
      <span className="material-symbols-outlined">{icono}</span>
      <h4>{titulo}</h4>
    </div>
    <div className="cont-resumen-card__filas">
      {filas.slice(0, 4).map((f, i) => (
        <div key={i} className="cont-resumen-card__fila">
          <span>{f.sede}</span>
          <strong>{formatCOP(f.valor)}</strong>
        </div>
      ))}
      {filas.length > 4 && (
        <div className="cont-resumen-card__fila cont-resumen-card__fila--more">
          <span>+{filas.length - 4} proveedores mas</span>
          <span />
        </div>
      )}
    </div>
    <div className="cont-resumen-card__total">
      <span>Total semana</span>
      <span>{formatCOP(total)}</span>
    </div>
  </div>
);

const DeudaBadge = ({ estado }) => {
  const cfg = ESTADOS_DEUDA[estado] ?? ESTADOS_DEUDA.pendiente;
  return (
    <span
      className="cont-estado-badge"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
};

// ── TarjetaKpi — usada en el Panel General ────────────────────
const TarjetaKpi = ({ titulo, icono, color, valor, subtitulo }) => (
  <div className="panel-kpi-card" style={{ "--kpi-color": color }}>
    <div className="panel-kpi-card__icon">
      <span className="material-symbols-outlined">{icono}</span>
    </div>
    <div className="panel-kpi-card__body">
      <span className="panel-kpi-card__valor">{valor}</span>
      <span className="panel-kpi-card__titulo">{titulo}</span>
      {subtitulo && <span className="panel-kpi-card__sub">{subtitulo}</span>}
    </div>
  </div>
);

// ── ArqueoBloque — tabla estructurada del arqueo semanal ──────
const ArqueoBloque = ({ numero, titulo, columnas, filas, totalFila }) => (
  <section className="arqueo-bloque">
    <h3 className="arqueo-bloque__titulo">
      <span className="arqueo-bloque__num">{numero}</span>
      {titulo}
    </h3>
    <div className="arqueo-bloque__tabla-wrap">
      <table className="arqueo-tabla">
        <thead>
          <tr>
            {columnas.map((col) => <th key={col}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i}>
              {fila.map((celda, j) => <td key={j}>{celda}</td>)}
            </tr>
          ))}
        </tbody>
        {totalFila && (
          <tfoot>
            <tr className="arqueo-tabla__total">
              {totalFila.map((celda, j) => <td key={j}><strong>{celda}</strong></td>)}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  </section>
);

// ══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════
const ContabilidadPage = () => {
  const { usuario, esAdmin, esBodega } = useAuth();
  const sedeIdUsuario = usuario?.sedeId ?? null;
  const puedeRegistrar = esAdmin || esBodega;

  const [tab,        setTab]        = useState("ingresos");
  const [cargando,   setCargando]   = useState(false);
  const [ingresos,   setIngresos]   = useState([]);
  const [egresos,    setEgresos]    = useState([]);
  const [cartera,    setCartera]    = useState([]);
  const [proveedores,setProveedores]= useState([]);
  const [resumenProv,setResumenProv]= useState([]);
  const [arqueo,     setArqueo]     = useState(null);
  const [arqueoError,setArqueoError]= useState("");
  const [panelGeneral,setPanelGeneral] = useState(null);

  const [filtroSemana,    setFiltroSemana]    = useState(String(SEM_ACTUAL));
  const [filtroSedeId,    setFiltroSedeId]    = useState(sedeIdUsuario ? String(sedeIdUsuario) : "");
  const [filtroPanelF,    setFiltroPanelFecha]= useState(HOY);

  const [modalOpen,    setModalOpen]    = useState(false);
  const [modalTipo,    setModalTipo]    = useState("");
  const [itemEditar,   setItemEditar]   = useState(null);
  const [itemEliminar, setItemEliminar] = useState(null);
  const [eliminarTipo, setEliminarTipo] = useState("");

  const [form, setForm] = useState(() => ({
    fecha:       HOY,
    sedeId:      sedeIdUsuario ? String(sedeIdUsuario) : "",
    efectivo:    "",
    cuentas:     "",
    observacion: "",
    concepto:    "",
    total:       "",
    observaciones:"",
    saldoDia:    "",
    proveedorId: "",
    valorAbono:  "",
    tipoAbono:   "abono_proveedor",
  }));

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  // ── Carga de datos ────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setArqueoError("");
    try {
      const fBase    = { semana: filtroSemana || undefined, sedeId: filtroSedeId || undefined };
      const fSem     = { semana: filtroSemana || undefined };
      const semanaNum = getSemanaNumero(filtroSemana);

      if (tab === "ingresos") {
        setIngresos(await contabilidadService.obtenerIngresos(fBase));
      } else if (tab === "egresos") {
        setEgresos(await contabilidadService.obtenerEgresos(fBase));
      } else if (tab === "cartera") {
        setCartera(await contabilidadService.obtenerCartera(fBase));
      } else if (tab === "proveedores") {
        const [lista, resumen] = await Promise.all([
          contabilidadService.obtenerProveedores(fBase),
          contabilidadService.obtenerResumenProveedores(semanaNum),
        ]);
        setProveedores(lista);
        setResumenProv(resumen);
      } else if (tab === "arqueo") {
        const [reporte, carteraSem, invSem] = await Promise.all([
          contabilidadService.obtenerArqueo(semanaNum),
          contabilidadService.obtenerCartera(fSem),
          contabilidadService.obtenerInventarioSemanal(semanaNum),
        ]);
        if (reporte) {
          setArqueo({ ...reporte, carteraSemana: carteraSem, inventarioSemana: invSem });
        } else {
          setArqueo(null);
          setArqueoError("No se pudo cargar el arqueo. Verifica que existan registros para esta semana.");
        }
      } else if (tab === "panel") {
        setPanelGeneral(await contabilidadService.obtenerPanelGeneral(filtroPanelF));
      }
    } catch (err) {
      toast.error("Error al cargar datos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [tab, filtroSemana, filtroSedeId, filtroPanelF]);

  useEffect(() => {
    const id = window.setTimeout(() => { void cargarDatos(); }, 0);
    return () => window.clearTimeout(id);
  }, [cargarDatos]);

  // ── Cálculos derivados ────────────────────────────────────
  const totalIngresoForm = useMemo(
    () => (parseFloat(form.efectivo) || 0) + (parseFloat(form.cuentas) || 0),
    [form.efectivo, form.cuentas]
  );

  const semanaNumero = useMemo(() => getSemanaNumero(filtroSemana), [filtroSemana]);
  const rangoSemana  = useMemo(() => getRangoSemana(semanaNumero),  [semanaNumero]);

  const resumenIngEfectivo = useMemo(() => resumenPorSede(ingresos, "efectivo"), [ingresos]);
  const resumenIngCuentas  = useMemo(() => resumenPorSede(ingresos, "cuentas"),  [ingresos]);
  const resumenIngTotal    = useMemo(() => resumenPorSede(ingresos, "total"),    [ingresos]);
  const totalIngEfectivo   = useMemo(() => totalDeSede(ingresos, "efectivo"),    [ingresos]);
  const totalIngCuentas    = useMemo(() => totalDeSede(ingresos, "cuentas"),     [ingresos]);
  const totalIngGeneral    = useMemo(() => totalDeSede(ingresos, "total"),       [ingresos]);
  const totalEgrGeneral    = useMemo(() => totalDeSede(egresos,   "total"),      [egresos]);
  const resumenEgrPorSede  = useMemo(() => resumenPorSede(egresos, "total"),     [egresos]);

  const resumenCarteraSedes = useMemo(() =>
    SEDES.map((s) => {
      const regs = [...cartera]
        .filter((c) => c.sedeId === s.id)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      return { sede: s.nombre, valor: regs[0]?.saldoDia ?? 0 };
    }), [cartera]);

  const resumenCarteraTotal = useMemo(
    () => cartera.reduce((s, c) => s + toNumber(c.saldoDia), 0),
    [cartera]
  );
  const totalAbonosProv = useMemo(() => sumar(resumenProv, "abonos"),      [resumenProv]);
  const totalPagadoProv = useMemo(() => sumar(resumenProv, "totalPagado"), [resumenProv]);

  const ingresosMapeados  = useMemo(() => mapNombreSede(ingresos),        [ingresos]);
  const egresosMapeados   = useMemo(() => mapNombreSede(egresos),         [egresos]);
  const carteraMapeada    = useMemo(() => mapNombreSede(cartera),         [cartera]);
  const proveedoresMap    = useMemo(() => mapProveedorNombre(proveedores),[proveedores]);

  const arqueoIngresos = useMemo(() =>
    rowsDeReporte(arqueo?.ingresos).map((r) => ({
      sede: r.sede, sedeId: r.sedeId,
      efectivo: toNumber(r.efectivo), cuentas: toNumber(r.cuentas), total: toNumber(r.total),
    })), [arqueo]);

  const arqueoEgresos = useMemo(() =>
    rowsDeReporte(arqueo?.egresos).map((r) => {
      const oper = toNumber(r.operativo ?? r.egresos);
      const prov = toNumber(r.proveedores);
      return {
        sede: r.sede, sedeId: r.sedeId,
        operativo: oper, proveedores: prov,
        totalEgresos: toNumber(r.totalEgresos ?? r.total ?? (oper + prov)),
      };
    }), [arqueo]);

  const arqueoSaldoNeto = useMemo(() => {
    const raw = rowsDeReporte(arqueo?.saldoNeto);
    if (raw.length) {
      return raw.map((r) => {
        const ing = toNumber(r.ingresos);
        const egr = toNumber(r.egresos);
        return { sede: r.sede, sedeId: r.sedeId, ingresos: ing, egresos: egr, saldoNeto: toNumber(r.saldoNeto ?? r.saldo ?? (ing - egr)) };
      });
    }
    return arqueoIngresos.map((ing) => {
      const egr = arqueoEgresos.find((e) => e.sedeId === ing.sedeId);
      return { sede: ing.sede, sedeId: ing.sedeId, ingresos: ing.total, egresos: egr?.totalEgresos ?? 0, saldoNeto: ing.total - (egr?.totalEgresos ?? 0) };
    });
  }, [arqueo, arqueoIngresos, arqueoEgresos]);

  const arqueoCartera = useMemo(() => {
    const raw = Array.isArray(arqueo?.cartera) ? arqueo.cartera : arqueo?.cartera?.porSede ?? [];
    if (raw.length) {
      return raw.map((r) => ({
        sede: r.sede, sedeId: r.sedeId,
        saldoInicio: toNumber(r.saldoInicio),
        saldoCierre: toNumber(r.saldoCierre ?? r.saldoDia ?? r.saldoActual),
        variacion:   toNumber(r.variacion ?? ((r.saldoCierre ?? r.saldoDia ?? r.saldoActual) - r.saldoInicio)),
      }));
    }
    const regs = (arqueo?.carteraSemana ?? []).slice().sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    if (!regs.length) return SEDES.map((s) => ({ sede: s.nombre, sedeId: s.id, saldoInicio: 0, saldoCierre: 0, variacion: 0 }));
    return SEDES.map((s) => {
      const rows   = regs.filter((c) => c.sedeId === s.id);
      const ini    = toNumber(rows[0]?.saldoAnterior ?? rows[0]?.saldoDia);
      const cierre = toNumber(rows[rows.length - 1]?.saldoDia);
      return { sede: s.nombre, sedeId: s.id, saldoInicio: ini, saldoCierre: cierre, variacion: cierre - ini };
    });
  }, [arqueo]);

  const arqueoInventario = useMemo(() => {
    const raw = Array.isArray(arqueo?.inventario) ? arqueo.inventario : arqueo?.inventario?.porSede ?? [];
    if (raw.length) {
      return raw.map((r) => ({
        sede: r.sede, sedeId: r.sedeId,
        cantCierre:  toNumber(r.cantCierre ?? r.cantidad ?? r.cantidadIngresada),
        costoCierre: toNumber(r.costoCierre ?? r.costo),
      }));
    }
    const regs = arqueo?.inventarioSemana ?? [];
    if (!regs.length) return SEDES.map((s) => ({ sede: s.nombre, sedeId: s.id, cantCierre: 0, costoCierre: 0 }));
    return SEDES.map((s) => {
      const filas = regs.filter((i) => i.sedeId === s.id);
      return {
        sede: s.nombre, sedeId: s.id,
        cantCierre:  filas.reduce((t, i) => t + toNumber(i.cantidad ?? i.cantidadIngresada), 0),
        costoCierre: filas.reduce((t, i) => t + toNumber(i.costo), 0),
      };
    });
  }, [arqueo]);

  const arqueoTotales = useMemo(() => ({
    ingresos: {
      efectivo: arqueo?.ingresos?.totales?.efectivo ?? sumar(arqueoIngresos, "efectivo"),
      cuentas:  arqueo?.ingresos?.totales?.cuentas  ?? sumar(arqueoIngresos, "cuentas"),
      total:    arqueo?.ingresos?.totales?.total     ?? sumar(arqueoIngresos, "total"),
    },
    egresos: {
      operativo:   arqueo?.egresos?.totales?.operativo    ?? sumar(arqueoEgresos, "operativo"),
      proveedores: arqueo?.egresos?.totales?.proveedores  ?? sumar(arqueoEgresos, "proveedores"),
      total:       arqueo?.egresos?.totales?.totalEgresos ?? sumar(arqueoEgresos, "totalEgresos"),
    },
    saldoNeto:  arqueo?.saldoNeto?.total ?? sumar(arqueoSaldoNeto, "saldoNeto"),
    cartera:    toNumber(arqueo?.cartera),
    inventario: arqueo?.costoInventario  ?? sumar(arqueoInventario, "costoCierre"),
  }), [arqueo, arqueoIngresos, arqueoEgresos, arqueoSaldoNeto, arqueoInventario]);

  const panelSedes = useMemo(() =>
    SEDES.map((s) => {
      const ing      = (panelGeneral?.ingresos?.porSede ?? []).find((r) => r.sedeId === s.id);
      const egr      = (panelGeneral?.egresos?.porSede  ?? []).find((r) => r.sedeId === s.id);
      const ingresoV = toNumber(ing?.total);
      const egresoV  = toNumber(egr?.total);
      return { sede: s.nombre, sedeId: s.id, efectivo: toNumber(ing?.efectivo), cuentas: toNumber(ing?.cuentas), ingresos: ingresoV, egresos: egresoV, saldoNeto: ingresoV - egresoV };
    }), [panelGeneral]);

  const panelChartSedes = useMemo(() =>
    panelSedes.map((s) => ({ sede: s.sede, Ingresos: s.ingresos, Egresos: s.egresos, "Saldo Neto": s.saldoNeto })),
    [panelSedes]);

  // ── Columnas de tablas ────────────────────────────────────
  const colsIngresosArr = useMemo(() => [
    { campo: "fecha",       label: "Fecha",   tipo: "fecha"  },
    { campo: "semana",      label: "Sem.",    tipo: "texto"  },
    { campo: "sede",        label: "Sede",    tipo: "texto"  },
    { campo: "efectivo",    label: "Efectivo",tipo: "moneda" },
    { campo: "cuentas",     label: "Cuentas", tipo: "moneda" },
    { campo: "total",       label: "Total",   tipo: "moneda" },
    { campo: "observacion", label: "Obs.",    tipo: "texto"  },
  ], []);

  const colsEgresosArr = useMemo(() => [
    { campo: "fecha",        label: "Fecha",   tipo: "fecha"  },
    { campo: "semana",       label: "Sem.",    tipo: "texto"  },
    { campo: "sede",         label: "Sede",    tipo: "texto"  },
    { campo: "concepto",     label: "Concepto",tipo: "texto"  },
    { campo: "total",        label: "Total",   tipo: "moneda" },
    { campo: "observaciones",label: "Obs.",    tipo: "texto"  },
  ], []);

  const colsCarteraArr = useMemo(() => [
    { campo: "fecha",        label: "Fecha",          tipo: "fecha"  },
    { campo: "semana",       label: "Sem.",            tipo: "texto"  },
    { campo: "sede",         label: "Sede",            tipo: "texto"  },
    { campo: "saldoDia",     label: "Saldo del Dia",   tipo: "moneda", resaltar: true },
    { campo: "saldoAnterior",label: "Saldo Anterior",  tipo: "moneda" },
    { campo: "variacion",    label: "Variacion",       tipo: "moneda" },
  ], []);

  const colsProveedoresArr = useMemo(() => [
    { campo: "fecha",       label: "Fecha",    tipo: "fecha"  },
    { campo: "semana",      label: "Sem.",     tipo: "texto"  },
    { campo: "sede",        label: "Sede",     tipo: "texto"  },
    { campo: "proveedor",   label: "Proveedor",tipo: "texto"  },
    { campo: "valorPagado", label: "Pagado",   tipo: "moneda" },
    { campo: "estadoDeuda", label: "Estado",   tipo: "estado" },
    { campo: "observacion", label: "Obs.",     tipo: "texto"  },
  ], []);

  // ── Handlers de modales ───────────────────────────────────

  // IMPORTANTE: abrirEditarProv debe declararse ANTES de abrirNuevo
  // para que la referencia en accsProveedores sea válida.
  const abrirEditarProv = useCallback((item) => {
    setItemEditar(item);
    setModalTipo("abono");
    setForm((prev) => ({
      ...prev,
      fecha:       HOY,
      sedeId:      String(item.sedeId ?? sedeIdUsuario ?? ""),
      proveedorId: String(item.proveedorId ?? ""),
      valorAbono:  String(item.valorPagado ?? ""),
      observacion: item.observacion ?? "",
      tipoAbono:   "abono_proveedor",
    }));
    setModalOpen(true);
  }, [sedeIdUsuario]);

  const abrirAbono = useCallback((item) => {
    setItemEditar(item);
    setModalTipo("abono");
    setForm((prev) => ({
      ...prev,
      fecha:       HOY,
      sedeId:      String(item.sedeId ?? sedeIdUsuario ?? ""),
      proveedorId: String(item.proveedorId ?? ""),
      valorAbono:  "",
      observacion: item.observacion ?? "",
      tipoAbono:   "abono_proveedor",
    }));
    setModalOpen(true);
  }, [sedeIdUsuario]);

  const abrirNuevo = useCallback(() => {
    setItemEditar(null);
    setModalTipo(tab === "cartera" ? "cartera" : tab === "proveedores" ? "abono" : tab);
    setForm({
      fecha:        HOY,
      sedeId:       sedeIdUsuario ? String(sedeIdUsuario) : "",
      efectivo:     "",
      cuentas:      "",
      observacion:  "",
      concepto:     "",
      total:        "",
      observaciones:"",
      saldoDia:     "",
      proveedorId:  "",
      valorAbono:   "",
      tipoAbono:    "abono_proveedor",
    });
    setModalOpen(true);
  }, [tab, sedeIdUsuario]);

  const abrirEditar = useCallback((item, tipo) => {
    setItemEditar(item);
    setModalTipo(tipo);
    setForm((prev) => ({
      ...prev,
      fecha:        item.fecha?.split("T")[0] ?? HOY,
      sedeId:       String(item.sedeId),
      efectivo:     String(item.efectivo     ?? ""),
      cuentas:      String(item.cuentas      ?? ""),
      observacion:  item.observacion ?? "",
      concepto:     item.concepto    ?? "",
      total:        String(item.total ?? ""),
      observaciones:item.observaciones ?? "",
      saldoDia:     String(item.saldoDia ?? ""),
    }));
    setModalOpen(true);
  }, []);

  const abrirEliminar = useCallback((item, tipo) => {
    setItemEliminar(item);
    setEliminarTipo(tipo);
  }, []);

  const cerrarModal = useCallback(() => {
    setModalOpen(false);
    setItemEditar(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setCargando(true);
    try {
      if (modalTipo === "ingreso") {
        if (itemEditar) {
          await contabilidadService.editarIngreso(itemEditar.id, {
            efectivo:    parseFloat(form.efectivo) || 0,
            cuentas:     parseFloat(form.cuentas)  || 0,
            observacion: form.observacion,
          });
          toast.success("Ingreso actualizado.");
        } else {
          await contabilidadService.registrarIngreso(form);
          toast.success("Ingreso registrado.");
        }
      } else if (modalTipo === "egreso") {
        if (itemEditar) {
          await contabilidadService.editarEgreso(itemEditar.id, {
            concepto:     form.concepto,
            total:        parseFloat(form.total) || 0,
            observaciones:form.observaciones,
          });
          toast.success("Egreso actualizado.");
        } else {
          await contabilidadService.registrarEgreso(form);
          toast.success("Egreso registrado.");
        }
      } else if (modalTipo === "cartera") {
        await contabilidadService.registrarCartera(form);
        toast.success("Cartera registrada.");
      } else if (modalTipo === "abono") {
        await contabilidadService.registrarPagoProveedor({
          ...form,
          valorAbono: parseFloat(form.valorAbono) || 0,
        });
        toast.success("Abono registrado.");
      }
      setModalOpen(false);
      setItemEditar(null);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCargando(false);
    }
  }, [modalTipo, itemEditar, form, cargarDatos]);

  const handleEliminar = useCallback(async () => {
    setCargando(true);
    try {
      if (eliminarTipo === "ingreso") await contabilidadService.eliminarIngreso(itemEliminar.id);
      else                            await contabilidadService.eliminarEgreso(itemEliminar.id);
      toast.success("Registro eliminado.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCargando(false);
      setItemEliminar(null);
      setEliminarTipo("");
      await cargarDatos();
    }
  }, [eliminarTipo, itemEliminar, cargarDatos]);

  // ── Acciones de tabla ─────────────────────────────────────
  const accsIngresos = useCallback((row) =>
    esAdmin ? [
      { label: "Editar",   icon: "edit",   onClick: () => abrirEditar(row, "ingreso") },
      { label: "Eliminar", icon: "delete", variante: "danger", onClick: () => abrirEliminar(row, "ingreso") },
    ] : undefined,
  [esAdmin, abrirEditar, abrirEliminar]);

  const accsEgresos = useCallback((row) =>
    esAdmin ? [
      { label: "Editar",   icon: "edit",   onClick: () => abrirEditar(row, "egreso") },
      { label: "Eliminar", icon: "delete", variante: "danger", onClick: () => abrirEliminar(row, "egreso") },
    ] : undefined,
  [esAdmin, abrirEditar, abrirEliminar]);

  // abrirEditarProv ya está declarada arriba — sin problema de orden
  const accsProveedores = useCallback((row) => [
    { label: "Abonar", icon: "payments", variante: "success", onClick: () => abrirAbono(row) },
    { label: "Editar", icon: "edit",                          onClick: () => abrirEditarProv(row) },
  ], [abrirAbono, abrirEditarProv]);

  // ── Derived UI ────────────────────────────────────────────
  const modalTitulo = useMemo(() => {
    if (itemEditar) {
      if (modalTipo === "ingreso") return "Editar Ingreso";
      if (modalTipo === "egreso")  return "Editar Egreso";
      if (modalTipo === "abono")   return "Editar Abono / Pago a Proveedor";
    }
    if (modalTipo === "ingreso") return "Registrar Ingreso";
    if (modalTipo === "egreso")  return "Registrar Egreso";
    if (modalTipo === "cartera") return "Registrar Saldo de Cartera";
    if (modalTipo === "abono")   return "Registrar Abono a Proveedor";
    return "";
  }, [modalTipo, itemEditar]);

  const modalBotonTexto = useMemo(() => {
    if (modalTipo === "abono") return "Registrar Abono";
    if (itemEditar)            return "Guardar cambios";
    return "Guardar";
  }, [modalTipo, itemEditar]);

  const datosActivos = useMemo(() => {
    if (tab === "ingresos")   return ingresosMapeados;
    if (tab === "egresos")    return egresosMapeados;
    if (tab === "cartera")    return carteraMapeada;
    if (tab === "proveedores")return proveedoresMap;
    return [];
  }, [tab, ingresosMapeados, egresosMapeados, carteraMapeada, proveedoresMap]);

  const columnasActivas = useMemo(() => {
    if (tab === "ingresos")   return colsIngresosArr;
    if (tab === "egresos")    return colsEgresosArr;
    if (tab === "cartera")    return colsCarteraArr;
    if (tab === "proveedores")return colsProveedoresArr;
    return [];
  }, [tab, colsIngresosArr, colsEgresosArr, colsCarteraArr, colsProveedoresArr]);

  const mostrarBotonRegistrar = useMemo(() =>
    puedeRegistrar && ["ingresos", "egresos", "cartera", "proveedores"].includes(tab),
  [tab, puedeRegistrar]);

  const textoBotonNuevo = useMemo(() => {
    if (tab === "ingresos")    return "Nuevo ingreso";
    if (tab === "egresos")     return "Nuevo egreso";
    if (tab === "cartera")     return "Registrar cartera";
    if (tab === "proveedores") return "Registrar abono";
    return "Nuevo";
  }, [tab]);

  const mostrarBuscador = tab !== "arqueo" && tab !== "panel";

  // ── Render helpers de celdas ──────────────────────────────
  const renderCeldaCartera = (fila, col) => {
    if (col.campo === "variacion") {
      const num = toNumber(fila.variacion ?? (toNumber(fila.saldoDia) - toNumber(fila.saldoAnterior)));
      return <span className={num >= 0 ? "cont-val-positivo" : "cont-val-negativo"}>{formatCOP(num)}</span>;
    }
    if (col.campo === "saldoDia" && col.resaltar) return <strong>{formatCOP(toNumber(fila.saldoDia))}</strong>;
    if (col.campo === "semana")                   return String(fila.semana ?? "—");
    return null;
  };

  const renderCeldaEgr = (fila) => {
    const et = etiquetaEgreso(fila.concepto);
    if (!et) return fila.concepto ?? "—";
    return (
      <span className="cont-concepto-wrap">
        <span className="cont-concepto-texto">{fila.concepto ?? "—"}</span>
        <span className="cont-etiqueta-egreso" style={{ color: et.color, borderColor: et.color + "44" }}>{et.label}</span>
      </span>
    );
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="contabilidad-page">
      {/* Header */}
      <div className="cont-page__header">
        <div>
          <h1 className="cont-page__title">Contabilidad</h1>
          <p className="cont-subtitulo">
            {tab === "panel" ? formatFecha(filtroPanelF) : `Semana ${filtroSemana}`}
          </p>
        </div>
        <div className="cont-page__acciones">
          {esAdmin && !["arqueo", "panel"].includes(tab) && (
            <div className="filter-group">
              <label htmlFor="cont-sede">Sede</label>
              <select id="cont-sede" value={filtroSedeId} onChange={(e) => setFiltroSedeId(e.target.value)} className="filter-select">
                <option value="">Todas</option>
                {SEDES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}
          {tab !== "panel" && (
            <div className="filter-group">
              <label htmlFor="cont-semana">Semana</label>
              <input id="cont-semana" type="number" min="1" max="53" value={filtroSemana}
                onChange={(e) => setFiltroSemana(e.target.value)} className="filter-select" style={{ minWidth: 72 }} />
            </div>
          )}
          {tab === "panel" && (
            <div className="filter-group">
              <label htmlFor="cont-panel-fecha">Fecha panel</label>
              <input id="cont-panel-fecha" type="date" max={HOY} value={filtroPanelF}
                onChange={(e) => setFiltroPanelFecha(e.target.value)} className="filter-select" />
            </div>
          )}
          {mostrarBotonRegistrar && (
            <button className="btn-cta" type="button" onClick={abrirNuevo}>
              <span className="material-symbols-outlined">add</span>
              {textoBotonNuevo}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="cont-tabs">
        {TABS.map((t) => (
          <button
            key={t.key} type="button"
            className={`cont-tab-btn ${tab === t.key ? "cont-tab-btn--active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className="material-symbols-outlined">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {cargando ? <Spinner /> : (
        <div className="cont-tab-body">

          {/* ── INGRESOS ── */}
          {tab === "ingresos" && (
            <>
              {ingresos.length > 0 && (
                <div className="cont-resumen-row">
                  <TarjetaResumen titulo="Efectivo"               icono="payments"        color="var(--aged-gold)" filas={resumenIngEfectivo} total={totalIngEfectivo} />
                  <TarjetaResumen titulo="Cuentas / Transferencias" icono="account_balance" color="var(--secondary)" filas={resumenIngCuentas}  total={totalIngCuentas}  />
                  <TarjetaResumen titulo="Total Ingresos"         icono="trending_up"     color="#4ade80"          filas={resumenIngTotal}    total={totalIngGeneral}  />
                </div>
              )}
              <div className="cont-tabla-wrap">
                <TablaGenerica columnas={columnasActivas} datos={datosActivos} filasPorPagina={10}
                  mostrarBuscador={mostrarBuscador} buscarEnCampos={["sede", "observacion"]}
                  paginacion renderAcciones={accsIngresos} />
              </div>
            </>
          )}

          {/* ── EGRESOS ── */}
          {tab === "egresos" && (
            <>
              {egresos.length > 0 && (
                <div className="cont-resumen-row">
                  <TarjetaResumen titulo="Total Egresos" icono="trending_down" color="var(--error)" filas={resumenEgrPorSede} total={totalEgrGeneral} />
                </div>
              )}
              <div className="cont-tabla-wrap">
                <TablaGenerica columnas={columnasActivas} datos={datosActivos} filasPorPagina={10}
                  mostrarBuscador={mostrarBuscador} buscarEnCampos={["sede", "concepto", "observaciones"]}
                  paginacion renderAcciones={accsEgresos}
                  renderCeldaCustom={(fila, col) => col.campo === "concepto" ? renderCeldaEgr(fila) : null} />
              </div>
            </>
          )}

          {/* ── CARTERA ── */}
          {tab === "cartera" && (
            <>
              {cartera.length > 0 && (
                <div className="cont-resumen-row">
                  <TarjetaResumen titulo="Cartera Actual por Sede" icono="account_balance" color="var(--primary)" filas={resumenCarteraSedes} total={resumenCarteraTotal} />
                </div>
              )}
              <div className="cont-tabla-wrap">
                <TablaGenerica columnas={columnasActivas} datos={datosActivos} filasPorPagina={10}
                  mostrarBuscador={mostrarBuscador} buscarEnCampos={["sede"]}
                  paginacion renderCeldaCustom={renderCeldaCartera} />
              </div>
            </>
          )}

          {/* ── PROVEEDORES ── */}
          {tab === "proveedores" && (
            <>
              {proveedores.length > 0 && (
                <div className="cont-resumen-row">
                  <TarjetaResumen titulo="Pagado a Proveedores" icono="account_balance_wallet" color="var(--secondary)"
                    filas={resumenProv.slice(0, 4).map((p) => ({ sede: p.proveedor, valor: p.totalPagado }))}
                    total={totalPagadoProv} />
                  <TarjetaResumenProveedor titulo="Abonos Registrados" icono="receipt_long" color="#4ade80"
                    filas={resumenProv.slice(0, 4).map((p) => ({ sede: p.proveedor, valor: p.abonos }))}
                    total={totalAbonosProv} />
                </div>
              )}
              <div className="cont-tabla-wrap">
                <TablaGenerica columnas={columnasActivas} datos={datosActivos} filasPorPagina={10}
                  mostrarBuscador={mostrarBuscador} buscarEnCampos={["sede", "proveedor", "observacion"]}
                  paginacion renderAcciones={accsProveedores}
                  renderCeldaCustom={(fila, col) => col.campo === "estadoDeuda" ? <DeudaBadge estado={estadoDeuda(fila)} /> : null} />
              </div>
            </>
          )}

          {/* ── PANEL GENERAL ── */}
          {tab === "panel" && !panelGeneral && (
            <EmptyState icono="dashboard"
              titulo={`No hay datos del panel general para ${formatFecha(filtroPanelF)}.`}
              detalle="Revisa que existan ingresos, egresos, cartera o stock para la fecha seleccionada." />
          )}

          {tab === "panel" && panelGeneral && (
            <div className="panel-general">
              <div className="panel-kpis">
                <TarjetaKpi titulo="Ingresos del dia"   icono="trending_up"           color="#4ade80"
                  valor={formatCOP(panelGeneral.ingresos?.total)}
                  subtitulo={`${formatFecha(filtroPanelF)} · ${formatFecha(rangoSemana.inicio)} al ${formatFecha(rangoSemana.fin)}`} />
                <TarjetaKpi titulo="Egresos del dia"    icono="trending_down"         color="var(--error)"
                  valor={formatCOP(panelGeneral.egresos?.total)}
                  subtitulo="Operativos registrados" />
                <TarjetaKpi titulo="Saldo neto"         icono="account_balance_wallet"
                  color={((panelGeneral.ingresos?.total ?? 0) - (panelGeneral.egresos?.total ?? 0)) >= 0 ? "#4ade80" : "var(--error)"}
                  valor={formatCOP((panelGeneral.ingresos?.total ?? 0) - (panelGeneral.egresos?.total ?? 0))}
                  subtitulo="Ingresos - egresos" />
                <TarjetaKpi titulo="Cartera actual"     icono="payments"              color="var(--primary)"
                  valor={formatCOP(panelGeneral.cartera)}
                  subtitulo="Saldo pendiente de clientes" />
                <TarjetaKpi titulo="Stock unidades"     icono="inventory_2"           color="var(--aged-gold)"
                  valor={new Intl.NumberFormat("es-CO").format(panelGeneral.totalStockUnidades)}
                  subtitulo="Total acumulado por sedes" />
              </div>

              <div className="panel-charts">
                <section className="panel-section">
                  <h3 className="panel-section__title">
                    <span className="material-symbols-outlined">bar_chart</span>
                    Resultado por sede
                  </h3>
                  <div className="panel-chart-wrap" style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={panelChartSedes} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                        <XAxis dataKey="sede" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCOP(value)} />
                        <Legend />
                        <Bar dataKey="Ingresos"    fill="var(--secondary)" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Egresos"     fill="var(--error)"     radius={[6, 6, 0, 0]} />
                        <Bar dataKey="Saldo Neto"  fill="#4ade80"          radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="panel-section">
                  <h3 className="panel-section__title">
                    <span className="material-symbols-outlined">payments</span>
                    Ingresos por metodo de pago
                  </h3>
                  <div className="panel-chart-wrap" style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { metodo: "Efectivo", valor: toNumber(panelGeneral.ingresos?.efectivo) },
                          { metodo: "Cuentas",  valor: toNumber(panelGeneral.ingresos?.cuentas)  },
                        ]}
                        margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
                      >
                        <XAxis dataKey="metodo" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCOP(value)} />
                        <Legend />
                        <Bar dataKey="valor" name="Valor" fill="var(--aged-gold)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>

              <section className="panel-section">
                <h3 className="panel-section__title">
                  <span className="material-symbols-outlined">store</span>
                  Consolidado por sede
                </h3>
                <div className="panel-sede-grid">
                  {panelSedes.map((s) => (
                    <div className="panel-sede-card" key={s.sedeId}>
                      <div className="panel-sede-card__header">
                        <span className="material-symbols-outlined">location_on</span>
                        <h4>{s.sede}</h4>
                      </div>
                      <div className="panel-sede-card__rows">
                        <div className="panel-sede-card__row"><span>Efectivo</span> <strong>{formatCOP(s.efectivo)}</strong></div>
                        <div className="panel-sede-card__row"><span>Cuentas</span>  <strong>{formatCOP(s.cuentas)}</strong></div>
                        <div className="panel-sede-card__row"><span>Ingresos</span> <strong className="panel-green">{formatCOP(s.ingresos)}</strong></div>
                        <div className="panel-sede-card__row"><span>Egresos</span>  <strong className="panel-red">{formatCOP(s.egresos)}</strong></div>
                        <div className="panel-sede-card__row"><span>Saldo neto</span><strong className={s.saldoNeto >= 0 ? "panel-green" : "panel-red"}>{formatCOP(s.saldoNeto)}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ── ARQUEO SEMANAL ── */}
          {tab === "arqueo" && (
            !arqueo ? (
              <EmptyState icono="summarize"
                titulo={arqueoError || `No hay datos de arqueo para la semana ${filtroSemana}.`}
                detalle="Valida que existan registros de ingresos, egresos, abonos, cartera o inventario en este rango." />
            ) : (
              <div className="cont-arqueo">
                <div className="arqueo-filtro-card">
                  <div className="filter-group">
                    <label htmlFor="arqueo-semana">Numero de semana</label>
                    <input id="arqueo-semana" type="number" min="1" max="53" value={filtroSemana}
                      onChange={(e) => setFiltroSemana(e.target.value)} className="filter-select" style={{ minWidth: 72 }} />
                  </div>
                  <div className="arqueo-rango-box">
                    <span className="material-symbols-outlined">calendar_month</span>
                    <div>
                      <strong>Rango de fechas</strong>
                      <span>{formatFecha(rangoSemana.inicio)} → {formatFecha(rangoSemana.fin)}</span>
                    </div>
                  </div>
                </div>

                <div className="arqueo-kpis">
                  <div className="arqueo-card" style={{ "--card-accent": "#4ade80" }}>
                    <div className="arqueo-card__header"><span className="material-symbols-outlined">trending_up</span><h4>Ingresos Semanales</h4></div>
                    <div className="arqueo-card__sede">General</div>
                    <strong>{formatCOP(arqueoTotales.ingresos.total)}</strong>
                    <span className="arqueo-card__sub">{formatCOP(arqueoTotales.ingresos.efectivo)} efectivo · {formatCOP(arqueoTotales.ingresos.cuentas)} cuentas</span>
                  </div>
                  <div className="arqueo-card" style={{ "--card-accent": "var(--error)" }}>
                    <div className="arqueo-card__header"><span className="material-symbols-outlined">trending_down</span><h4>Egresos Semanales</h4></div>
                    <div className="arqueo-card__sede">General</div>
                    <strong>{formatCOP(arqueoTotales.egresos.total)}</strong>
                    <span className="arqueo-card__sub">{formatCOP(arqueoTotales.egresos.operativo)} operativos · {formatCOP(arqueoTotales.egresos.proveedores)} proveedores</span>
                  </div>
                  <div className="arqueo-card" style={{ "--card-accent": arqueoTotales.saldoNeto >= 0 ? "#4ade80" : "var(--error)" }}>
                    <div className="arqueo-card__header"><span className="material-symbols-outlined">account_balance_wallet</span><h4>Saldo Neto</h4></div>
                    <div className="arqueo-card__sede">General</div>
                    <strong>{formatCOP(arqueoTotales.saldoNeto)}</strong>
                    <span className="arqueo-card__sub">Ingresos - egresos</span>
                  </div>
                  <div className="arqueo-card" style={{ "--card-accent": "var(--primary)" }}>
                    <div className="arqueo-card__header"><span className="material-symbols-outlined">payments</span><h4>Cartera</h4></div>
                    <div className="arqueo-card__sede">Actual</div>
                    <strong>{formatCOP(arqueoTotales.cartera)}</strong>
                    <span className="arqueo-card__sub">Saldo pendiente de clientes</span>
                  </div>
                  <div className="arqueo-card" style={{ "--card-accent": "var(--aged-gold)" }}>
                    <div className="arqueo-card__header"><span className="material-symbols-outlined">inventory_2</span><h4>Inventario</h4></div>
                    <div className="arqueo-card__sede">Semana</div>
                    <strong>{formatCOP(arqueoTotales.inventario)}</strong>
                    <span className="arqueo-card__sub">Costo de inventario ingresado</span>
                  </div>
                </div>

                <ArqueoBloque numero={1} titulo="Ingresos Semanales"
                  columnas={["Sede", "Efectivo", "Cuentas", "Total"]}
                  filas={arqueoIngresos.map((r) => [r.sede, formatCOP(r.efectivo), formatCOP(r.cuentas), formatCOP(r.total)])}
                  totalFila={["TOTAL GENERAL", formatCOP(arqueoTotales.ingresos.efectivo), formatCOP(arqueoTotales.ingresos.cuentas), formatCOP(arqueoTotales.ingresos.total)]} />

                <ArqueoBloque numero={2} titulo="Egresos Semanales"
                  columnas={["Sede", "Operativos", "Proveedores", "Total Egresos"]}
                  filas={arqueoEgresos.map((r) => [r.sede, formatCOP(r.operativo), formatCOP(r.proveedores), formatCOP(r.totalEgresos)])}
                  totalFila={["TOTAL GENERAL", formatCOP(arqueoTotales.egresos.operativo), formatCOP(arqueoTotales.egresos.proveedores), formatCOP(arqueoTotales.egresos.total)]} />

                <ArqueoBloque numero={3} titulo="Saldo Neto"
                  columnas={["Sede", "Ingresos", "Egresos", "Saldo Neto"]}
                  filas={arqueoSaldoNeto.map((r) => [r.sede, formatCOP(r.ingresos), formatCOP(r.egresos), formatCOP(r.saldoNeto)])}
                  totalFila={["TOTAL GENERAL", formatCOP(arqueoTotales.ingresos.total), formatCOP(arqueoTotales.egresos.total), formatCOP(arqueoTotales.saldoNeto)]} />

                <ArqueoBloque numero={4} titulo="Variacion de Cartera"
                  columnas={["Sede", "Saldo Inicio", "Saldo Cierre", "Variacion"]}
                  filas={arqueoCartera.map((r) => [r.sede, formatCOP(r.saldoInicio), formatCOP(r.saldoCierre), formatCOP(r.variacion)])}
                  totalFila={["TOTAL GENERAL", formatCOP(sumar(arqueoCartera, "saldoInicio")), formatCOP(sumar(arqueoCartera, "saldoCierre")), formatCOP(sumar(arqueoCartera, "variacion"))]} />

                <ArqueoBloque numero={5} titulo="Variacion de Inventario"
                  columnas={["Sede", "Cantidad Semana", "Costo Semana"]}
                  filas={arqueoInventario.map((r) => [r.sede, new Intl.NumberFormat("es-CO").format(r.cantCierre), formatCOP(r.costoCierre)])}
                  totalFila={["TOTAL GENERAL", new Intl.NumberFormat("es-CO").format(sumar(arqueoInventario, "cantCierre")), formatCOP(arqueoTotales.inventario)]} />
              </div>
            )
          )}

        </div>
      )}

      {/* ── MODAL UNIFICADO ── */}
      <Modal
        isOpen={modalOpen} onClose={cerrarModal}
        titulo={modalTitulo} textoBotonConfirmar={modalBotonTexto}
        onConfirmar={handleSubmit} mostrarCancelar
      >
        <div className="cont-modal-form">
          {!itemEditar && (
            <>
              <div className="cont-form-group">
                <label>Fecha *</label>
                <input type="date" name="fecha" value={form.fecha} onChange={handleFormChange} className="cont-input" max={HOY} />
              </div>
              {(esAdmin && modalTipo !== "abono") && (
                <div className="cont-form-group">
                  <label>Sede *</label>
                  <select name="sedeId" value={form.sedeId} onChange={handleFormChange} className="cont-input cont-select">
                    <option value="">— Selecciona —</option>
                    {SEDES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
              {modalTipo === "abono" && (
                <div className="cont-form-group">
                  <label>Sede *</label>
                  <select name="sedeId" value={form.sedeId} onChange={handleFormChange} className="cont-input cont-select">
                    <option value="">— Selecciona —</option>
                    {SEDES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
            </>
          )}

          {modalTipo === "ingreso" && (
            <>
              <div className="cont-form-group">
                <label>Efectivo (COP)</label>
                <input type="number" name="efectivo" value={form.efectivo} onChange={handleFormChange} className="cont-input" min="0" step="1000" placeholder="0" />
              </div>
              <div className="cont-form-group">
                <label>Cuentas / Transferencias (COP)</label>
                <input type="number" name="cuentas" value={form.cuentas} onChange={handleFormChange} className="cont-input" min="0" step="1000" placeholder="0" />
              </div>
              <div className="cont-total-display">
                <span>Total calculado</span>
                <span className="cont-total-valor">{formatCOP(totalIngresoForm)}</span>
              </div>
              <div className="cont-form-group">
                <label>Observaciones</label>
                <input type="text" name="observacion" value={form.observacion} onChange={handleFormChange} className="cont-input" placeholder="Ej: Ingreso dominical, cobro cartera..." />
              </div>
            </>
          )}

          {modalTipo === "egreso" && (
            <>
              <div className="cont-form-group">
                <label>Concepto *</label>
                <input type="text" name="concepto" value={form.concepto} onChange={handleFormChange} className="cont-input" placeholder="Gastos, Salarios, Arriendo..." />
              </div>
              <div className="cont-form-group">
                <label>Total (COP) *</label>
                <input type="number" name="total" value={form.total} onChange={handleFormChange} className="cont-input" min="0" step="1000" placeholder="0" />
                {form.total && <span className="cont-input-hint">{formatCOP(parseFloat(form.total) || 0)}</span>}
              </div>
              <div className="cont-form-group">
                <label>Observaciones</label>
                <textarea name="observaciones" value={form.observaciones} onChange={handleFormChange} className="cont-input cont-textarea" rows={3} placeholder="Ej: SUELDO POLLO Y PAGO NUNEZ, ARRIENDO..." />
              </div>
            </>
          )}

          {modalTipo === "cartera" && (
            <div className="cont-form-group">
              <label>Saldo del Dia (COP) *</label>
              <input type="number" name="saldoDia" value={form.saldoDia} onChange={handleFormChange} className="cont-input" min="0" step="1000" placeholder="0" />
              {form.saldoDia && <span className="cont-input-hint">{formatCOP(parseFloat(form.saldoDia) || 0)}</span>}
              <div className="cont-nota-info">
                <span className="material-symbols-outlined">info</span>
                <p>Ingresa solo el saldo del dia. La variacion respecto al dia anterior se calcula automaticamente.</p>
              </div>
            </div>
          )}

          {modalTipo === "abono" && (
            <>
              <div className="cont-form-group">
                <label>Proveedor</label>
                <input type="text"
                  value={proveedores.find((p) => p.proveedorId === parseInt(form.proveedorId))?.proveedor ?? (itemEditar?.proveedor ?? "Proveedor general")}
                  className="cont-input" disabled />
              </div>
              <div className="cont-form-group">
                <label>Valor del Abono (COP) *</label>
                <input type="number" name="valorAbono" value={form.valorAbono} onChange={handleFormChange} className="cont-input" min="0" step="1000" placeholder="0" />
                {form.valorAbono && <span className="cont-input-hint">{formatCOP(parseFloat(form.valorAbono) || 0)}</span>}
              </div>
              <div className="cont-form-group">
                <label>Observacion</label>
                <input type="text" name="observacion" value={form.observacion} onChange={handleFormChange} className="cont-input" placeholder="Concepto del abono..." />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      <Modal
        isOpen={!!itemEliminar}
        onClose={() => { setItemEliminar(null); setEliminarTipo(""); }}
        titulo="Eliminar registro"
        textoBotonConfirmar="Si, eliminar"
        onConfirmar={handleEliminar}
        mostrarCancelar
      >
        <div className="cont-confirm-body">
          <span className="material-symbols-outlined">warning</span>
          <p>¿Eliminar este registro? Esta accion no se puede deshacer.</p>
        </div>
      </Modal>
    </div>
  );
};

export default ContabilidadPage;