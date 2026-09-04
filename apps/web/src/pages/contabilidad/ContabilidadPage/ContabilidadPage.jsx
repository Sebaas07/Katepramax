import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import contabilidadService from "@/services/contabilidad.service";
import reporteService from "@/services/reporte.service";
import inventarioService from "@/services/inventario.service";
import { getSemanaISO, getRangoSemana, formatFecha } from "@/utils/formatters";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import {
  construirPayloadContabilidad,
  esCampoNumerico,
  esCampoTexto,
  normalizarNumeroInput,
  normalizarSemana,
  sanitizarTextoInput,
  validarFormularioContabilidad,
} from "@/utils/contabilidadForm";

// ── Tabs
import IngresosTab from "../IngresosTab";
import EgresosTab from "../EgresosTab";
//import CarteraTab from "../CarteraTab";
import ProveedoresTab from "../ProveedoresTab";
import PanelGeneralTab from "../PanelGeneralTab";
import ArqueoSemanalTab from "../ArqueoSemanalTab";
import GananciaGastoTab from "../GananciaGastoTab";
import CobrosEntregadorTab from "../CobrosEntregadorTab";
import CierreCajaTab from "../CierreCajaTab";

// ── Shared UI
import { Spinner, EmptyState } from "../ContabilidadUI";
import ContabilidadModal from "../ContabilidadModal";
import Modal from "@/components/common/Modal/Modal";

import "./ContabilidadPage.css";

// ─────────────────────────────────────────────────────────────
const hoyISO = () => new Date().toISOString().split("T")[0];
const SEM_ACTUAL = getSemanaISO(new Date());

const TABS = [
  { key: "ingresos", label: "Ingresos Diarios", icon: "trending_up" },
  { key: "egresos", label: "Egresos Diarios", icon: "trending_down" },
  //{ key: "cartera", label: "Cartera", icon: "account_balance" },
  { key: "proveedores", label: "Proveedores", icon: "payments" },
  { key: "cobros", label: "Cobros por Entregador", icon: "delivery_dining" },
  { key: "cierre-diario", label: "Cierre Diario", icon: "today" },
  { key: "cierre-semanal", label: "Cierre Semanal", icon: "date_range" },
  { key: "panel", label: "Panel General", icon: "dashboard" },
  { key: "ganancia", label: "Ganancia / Gasto", icon: "point_of_sale" },
  { key: "arqueo", label: "Arqueo Semanal", icon: "summarize" },
];

const FORM_VACIO = {
  fecha: hoyISO(),
  sedeId: "",
  efectivo: "",
  cuentas: "",
  observacion: "",
  concepto: "",
  total: "",
  observaciones: "",
  saldoDia: "",
  proveedorId: "",
  valorAbono: "",
  comprobante: "",
  tipoAbono: "abono_proveedor",
};

// ─────────────────────────────────────────────────────────────
const ContabilidadPage = () => {
  const { usuario, esAdmin, esBodega, isAuthenticated, isSessionChecked } =
    useAuth();
  const sedeIdUsuario = usuario?.sedeId ?? null;
  const puedeRegistrar = esAdmin || esBodega;

  // ── Estado de datos ───────────────────────────────────────
  const [tab, setTab] = useState("ingresos");
  const [cargando, setCargando] = useState(false);
  const [sedes, setSedes] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  //const [cartera, setCartera] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [catalogoProveedores, setCatalogoProveedores] = useState([]);
  const [resumenProv, setResumenProv] = useState([]);
  const [resumenIngSemanal, setResumenIngSemanal] = useState(null);
  const [totalesDiaIng, setTotalesDiaIng] = useState([]);
  const [resumenEgrSemanal, setResumenEgrSemanal] = useState(null);
  const [resumenEgrConcepto, setResumenEgrConcepto] = useState([]);
  const [totalesDiaEgr, setTotalesDiaEgr] = useState([]);
  const [resumenSedeAbonos, setResumenSedeAbonos] = useState([]);
  const [deudaProveedores, setDeudaProveedores] = useState([]);
  const [arqueo, setArqueo] = useState(null);
  const [arqueoError, setArqueoError] = useState("");
  const [panelGeneral, setPanelGeneral] = useState(null);
  const [corteCaja, setCorteCaja] = useState(null);
  const [cargandoCorte, setCargandoCorte] = useState(false);
  const [cobrosEntregador, setCobrosEntregador] = useState(null);

  // ── Filtros ───────────────────────────────────────────────
  const [filtroSemana, setFiltroSemana] = useState(String(SEM_ACTUAL));
  const [filtroSedeId, setFiltroSedeId] = useState(
    sedeIdUsuario ? String(sedeIdUsuario) : "",
  );
  const [filtroPanelF, setFiltroPanelFecha] = useState(hoyISO());
  const [periodoGanancia, setPeriodoGanancia] = useState("dia");
  const [fechaGanancia, setFechaGanancia] = useState(hoyISO());
  const [fechaInicioCobros, setFechaInicioCobros] = useState(
    () => getRangoSemana(SEM_ACTUAL).inicio,
  );
  const [fechaFinCobros, setFechaFinCobros] = useState(
    () => getRangoSemana(SEM_ACTUAL).fin,
  );

  // ── Estado del modal ──────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTipo, setModalTipo] = useState("");
  const [itemEditar, setItemEditar] = useState(null);
  const [itemEliminar, setItemEliminar] = useState(null);
  const [eliminarTipo, setEliminarTipo] = useState("");

  const [form, setForm] = useState(() => ({
    ...FORM_VACIO,
    sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
  }));

  const handleFormChange = useCallback((e) => {
    const { name, value } = e.target;
    if (esCampoNumerico(name)) {
      setForm((prev) => ({ ...prev, [name]: normalizarNumeroInput(value) }));
      return;
    }
    if (esCampoTexto(name)) {
      setForm((prev) => ({
        ...prev,
        [name]: sanitizarTextoInput(value, name === "concepto" ? 200 : 500),
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleFiltroSemana = useCallback((valor) => {
    setFiltroSemana(normalizarSemana(valor));
  }, []);

  const esTabCierre = tab === "cierre-diario" || tab === "cierre-semanal";

  // ── Carga de datos ────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    if (tab === "ganancia" || esTabCierre) {
      setCargando(false);
      return;
    }
    setCargando(true);
    setArqueoError("");
    try {
      const semanaNum = parseInt(filtroSemana, 10) || SEM_ACTUAL;
      const fBase = {
        semana: filtroSemana || undefined,
        sedeId: filtroSedeId || undefined,
      };
      const fSem = { semana: filtroSemana || undefined };

      if (tab === "ingresos") {
        const [lista, resSemanal, totDia] = await Promise.all([
          contabilidadService.obtenerIngresos(fBase),
          contabilidadService.obtenerResumenSemanalIngresos(semanaNum),
          contabilidadService.obtenerTotalesDiaIngresos(semanaNum),
        ]);
        setIngresos(lista);
        setResumenIngSemanal(resSemanal);
        setTotalesDiaIng(totDia);
      } else if (tab === "egresos") {
        const [lista, resSemanal, resConcepto, totDia] = await Promise.all([
          contabilidadService.obtenerEgresos(fBase),
          contabilidadService.obtenerResumenSemanalEgresos(semanaNum),
          contabilidadService.obtenerResumenConceptoEgresos(semanaNum),
          contabilidadService.obtenerTotalesDiaEgresos(semanaNum),
        ]);
        setEgresos(lista);
        setResumenEgrSemanal(resSemanal);
        setResumenEgrConcepto(resConcepto);
        setTotalesDiaEgr(totDia);
      } else if (tab === "cartera") {
        //setCartera(await contabilidadService.obtenerCartera(fBase));
      } else if (tab === "proveedores") {
        const [lista, resumen, resSede, saldosDeuda] = await Promise.all([
          contabilidadService.listarAbonos(fBase),
          contabilidadService.obtenerResumenProveedores(semanaNum),
          contabilidadService.obtenerResumenSedeAbonos(semanaNum),
          contabilidadService.obtenerDeudaProveedores(),
        ]);
        setProveedores(lista);
        setResumenProv(resumen);
        setResumenSedeAbonos(resSede);
        setDeudaProveedores(saldosDeuda);
      } else if (tab === "arqueo") {
        const [reporte, carteraSem, invSem] = await Promise.all([
          contabilidadService.obtenerArqueo(semanaNum),
          contabilidadService.obtenerCartera(fSem),
          contabilidadService.obtenerInventarioSemanal(semanaNum),
        ]);
        if (reporte) {
          setArqueo({
            ...reporte,
            carteraSemana: carteraSem,
            inventarioSemana: invSem,
          });
        } else {
          setArqueo(null);
          setArqueoError(
            "No se pudo cargar el arqueo. Verifica que existan registros para esta semana.",
          );
        }
      } else if (tab === "panel") {
        const [panel, totIngDia, totEgrDia] = await Promise.all([
          contabilidadService.obtenerPanelGeneral(filtroPanelF),
          contabilidadService.obtenerTotalesDiaIngresos(semanaNum),
          contabilidadService.obtenerTotalesDiaEgresos(semanaNum),
        ]);
        setPanelGeneral(panel);
        setTotalesDiaIng(totIngDia);
        setTotalesDiaEgr(totEgrDia);
      } else if (tab === "cobros") {
        const sede = esAdmin ? (filtroSedeId ? parseInt(filtroSedeId, 10) : undefined) : undefined;
        const data = await reporteService.obtenerCobrosEntregador({
          fechaInicio: fechaInicioCobros,
          fechaFin: fechaFinCobros,
          sedeId: sede,
        });
        setCobrosEntregador(data);
      }
    } catch (err) {
      toast.error("Error al cargar datos: " + (err?.message || "desconocido"));
    } finally {
      setCargando(false);
    }
  }, [tab, esTabCierre, filtroSemana, filtroSedeId, filtroPanelF, fechaInicioCobros, fechaFinCobros, esAdmin]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    inventarioService
      .obtenerSedes()
      .then((data) => setSedes(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Error al cargar sedes:", err);
        setSedes([]);
      });
  }, [isSessionChecked, isAuthenticated]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    contabilidadService
      .obtenerProveedores()
      .then(setCatalogoProveedores)
      .catch(() => setCatalogoProveedores([]));
  }, [isSessionChecked, isAuthenticated]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => {
      void cargarDatos();
    }, 0);
    return () => window.clearTimeout(id);
  }, [cargarDatos, isSessionChecked, isAuthenticated]);

  // ── Corte de caja (Ganancia / Gasto) ──────────────────────
  const rangoGanancia = useMemo(() => {
    const [anio, mes, dia] = fechaGanancia.split("-").map(Number);
    if (periodoGanancia === "dia") {
      return { desde: fechaGanancia, hasta: fechaGanancia };
    }
    if (periodoGanancia === "quincena") {
      const ultimoDiaMes = new Date(anio, mes, 0).getDate();
      const pad = (n) => String(n).padStart(2, "0");
      return dia <= 15
        ? { desde: `${anio}-${pad(mes)}-01`, hasta: `${anio}-${pad(mes)}-15` }
        : { desde: `${anio}-${pad(mes)}-16`, hasta: `${anio}-${pad(mes)}-${pad(ultimoDiaMes)}` };
    }
    const ultimoDiaMes = new Date(anio, mes, 0).getDate();
    const pad = (n) => String(n).padStart(2, "0");
    return { desde: `${anio}-${pad(mes)}-01`, hasta: `${anio}-${pad(mes)}-${pad(ultimoDiaMes)}` };
  }, [periodoGanancia, fechaGanancia]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    if (tab !== "ganancia") return;
    let activo = true;
    setCargandoCorte(true);
    reporteService
      .obtenerCorteCaja({ ...rangoGanancia, sedeId: filtroSedeId || undefined })
      .then((data) => {
        if (activo) setCorteCaja(data);
      })
      .catch((err) => {
        if (!activo) return;
        toast.error("Error al cargar el corte de caja: " + (err?.message || "desconocido"));
        setCorteCaja(null);
      })
      .finally(() => {
        if (activo) setCargandoCorte(false);
      });
    return () => {
      activo = false;
    };
  }, [tab, rangoGanancia, filtroSedeId, isSessionChecked, isAuthenticated]);

  const mapSede = useCallback(
    (items) =>
      items.map((i) => ({
        ...i,
        sede:
          i.sede?.nombre ??
          sedes.find((s) => s.id === i.sedeId)?.nombre ??
          `Sede ${i.sedeId}`,
        observaciones: i.observacion ?? i.observaciones ?? "",
      })),
    [sedes],
  );

  const mapProveedor = useCallback(
    (items) =>
      items.map((i) => ({
        ...i,
        sede:
          i.sede?.nombre ??
          sedes.find((s) => s.id === i.sedeId)?.nombre ??
          `Sede ${i.sedeId}`,
        proveedor:
          i.proveedor?.nombre ??
          i.proveedorNombre ??
          `Proveedor ${i.proveedorId ?? ""}`.trim(),
        observacion: i.observacion ?? "",
      })),
    [sedes],
  );

  const ingresosMapeados = useMemo(
    () => mapSede(ingresos),
    [ingresos, mapSede],
  );
  const egresosMapeados = useMemo(() => mapSede(egresos), [egresos, mapSede]);
  const proveedoresMap = useMemo(() => {
    const saldoPorProveedor = new Map(
      deudaProveedores.map((d) => [
        Number(d.proveedorId),
        Number(d.saldoPendiente ?? 0),
      ]),
    );
    return mapProveedor(proveedores).map((fila) => ({
      ...fila,
      saldoPendiente: saldoPorProveedor.get(Number(fila.proveedorId)) ?? 0,
    }));
  }, [proveedores, mapProveedor, deudaProveedores]);

  const totalIngresoForm = useMemo(
    () => (parseFloat(form.efectivo) || 0) + (parseFloat(form.cuentas) || 0),
    [form.efectivo, form.cuentas],
  );

  const semanaNumero = useMemo(
    () => parseInt(filtroSemana, 10) || SEM_ACTUAL,
    [filtroSemana],
  );
  const erroresForm = useMemo(
    () => validarFormularioContabilidad({ modalTipo, form }),
    [modalTipo, form],
  );

  const resetForm = useCallback(
    () => ({
      ...FORM_VACIO,
      sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
    }),
    [sedeIdUsuario],
  );

  const abrirEditarProv = useCallback(
    (item) => {
      setItemEditar(item);
      setModalTipo("abono");
      setForm((prev) => ({
        ...prev,
        fecha: hoyISO(),
        sedeId: String(item.sedeId ?? sedeIdUsuario ?? ""),
        proveedorId: String(item.proveedorId ?? ""),
        valorAbono: String(item.valorPagado ?? ""),
        observacion: item.observacion ?? "",
        comprobante: item.comprobante ?? "",
        tipoAbono: "abono_proveedor",
      }));
      setModalOpen(true);
    },
    [sedeIdUsuario],
  );

  const abrirAbono = useCallback(
    (item) => {
      setItemEditar(null);
      setModalTipo("abono");
      setForm((prev) => ({
        ...prev,
        fecha: hoyISO(),
        sedeId: String(item.sedeId ?? sedeIdUsuario ?? ""),
        proveedorId: String(item.proveedorId ?? ""),
        valorAbono: "",
        observacion: "",
        comprobante: "",
        tipoAbono: "abono_proveedor",
      }));
      setModalOpen(true);
    },
    [sedeIdUsuario],
  );

  const TAB_A_MODAL_TIPO = {
    ingresos: "ingreso",
    egresos: "egreso",
    proveedores: "abono",
  };

  const abrirNuevo = useCallback(() => {
    setItemEditar(null);
    setModalTipo(TAB_A_MODAL_TIPO[tab] ?? tab);
    setForm(resetForm());
    setModalOpen(true);
  }, [tab, resetForm]);

  const abrirEditar = useCallback((item, tipo) => {
    setItemEditar(item);
    setModalTipo(tipo);
    setForm((prev) => ({
      ...prev,
      fecha: item.fecha?.split("T")[0] ?? hoyISO(),
      sedeId: String(item.sedeId),
      efectivo: String(item.efectivo ?? ""),
      cuentas: String(item.cuentas ?? ""),
      observacion: item.observacion ?? "",
      concepto: item.concepto ?? "",
      total: String(item.total ?? ""),
      observaciones: item.observacion ?? item.observaciones ?? "",
      saldoDia: String(item.saldoDia ?? ""),
      proveedorId: String(item.proveedorId ?? ""),
      valorAbono: String(item.valorPagado ?? ""),
      comprobante: item.comprobante ?? "",
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
      const payload = construirPayloadContabilidad(modalTipo, form);

      if (modalTipo === "ingreso") {
        const datos = {
          efectivo: payload.efectivo,
          cuentas: payload.cuentas,
          observacion: payload.observacion,
        };
        if (itemEditar) {
          await contabilidadService.editarIngreso(itemEditar.id, datos);
          toast.success("Ingreso actualizado.");
        } else {
          await contabilidadService.registrarIngreso(payload);
          toast.success("Ingreso registrado.");
        }
      } else if (modalTipo === "egreso") {
        const datos = {
          concepto: payload.concepto,
          total: payload.total,
          observaciones: payload.observacion,
        };
        if (itemEditar) {
          await contabilidadService.editarEgreso(itemEditar.id, datos);
          toast.success("Egreso actualizado.");
        } else {
          await contabilidadService.registrarEgreso(payload);
          toast.success("Egreso registrado.");
        }
      } else if (modalTipo === "cartera") {
        const datos = {
          fecha: payload.fecha,
          semana: payload.semana,
          sedeId: payload.sedeId,
          saldoDia: payload.saldoDia,
        };
        if (itemEditar) {
          await contabilidadService.editarCartera(itemEditar.id, datos);
          toast.success("Cartera actualizada.");
        } else {
          await contabilidadService.registrarCartera(payload);
          toast.success("Cartera registrada.");
        }
      } else if (modalTipo === "abono") {
        const datos = {
          valorPagado: payload.valorPagado,
          observacion: payload.observacion,
          comprobante: payload.comprobante,
        };
        if (itemEditar) {
          await contabilidadService.editarPagoProveedor(itemEditar.id, datos);
          toast.success("Abono actualizado.");
        } else {
          await contabilidadService.registrarPagoProveedor(payload);
          toast.success("Abono registrado.");
        }
      } else {
        throw new Error("Tipo de formulario no válido.");
      }
      setModalOpen(false);
      setItemEditar(null);
      await cargarDatos();
    } catch (err) {
      toast.error(err?.message || "No fue posible guardar el registro.");
    } finally {
      setCargando(false);
    }
  }, [modalTipo, itemEditar, form, cargarDatos]);

  const handleEliminar = useCallback(async () => {
    if (!itemEliminar) return;
    setCargando(true);
    try {
      if (eliminarTipo === "ingreso")
        await contabilidadService.eliminarIngreso(itemEliminar.id);
      else if (eliminarTipo === "egreso")
        await contabilidadService.eliminarEgreso(itemEliminar.id);
      else if (eliminarTipo === "cartera")
        await contabilidadService.eliminarCartera(itemEliminar.id);
      else if (eliminarTipo === "abono")
        await contabilidadService.eliminarPagoProveedor(itemEliminar.id);
      else throw new Error("Tipo de registro no válido.");
      toast.success("Registro eliminado.");
    } catch (err) {
      toast.error(err?.message || "No fue posible eliminar el registro.");
    } finally {
      setCargando(false);
      setItemEliminar(null);
      setEliminarTipo("");
      await cargarDatos();
    }
  }, [eliminarTipo, itemEliminar, cargarDatos]);

  const mostrarBotonRegistrar =
    puedeRegistrar &&
    ["ingresos", "egresos", "proveedores"].includes(tab);

  const textoBotonNuevo =
    {
      ingresos: "Nuevo ingreso",
      egresos: "Nuevo egreso",
      proveedores: "Registrar abono",
    }[tab] ?? "Nuevo";

  const subtituloHeader =
    tab === "panel"
      ? formatFecha(filtroPanelF)
      : tab === "ganancia"
        ? `${formatFecha(rangoGanancia.desde)}${rangoGanancia.desde !== rangoGanancia.hasta ? ` — ${formatFecha(rangoGanancia.hasta)}` : ""}`
        : tab === "cierre-diario"
          ? "Cierre de caja del día"
          : tab === "cierre-semanal"
            ? "Cierre de caja de la semana"
            : tab === "cobros"
              ? `${formatFecha(fechaInicioCobros)} — ${formatFecha(fechaFinCobros)}`
              : `Semana ${filtroSemana || SEM_ACTUAL}`;

  return (
    <div className="cont-page">
      <div className="cont-page__header">
        <div>
          <h1 className="cont-page__title">Contabilidad</h1>
          <p className="cont-subtitulo">{subtituloHeader}</p>
        </div>
        <div className="cont-page__acciones">
          {esAdmin && !["arqueo", "panel"].includes(tab) && (
            <div className="filter-group">
              <label htmlFor="cont-sede">Sede</label>
              <select
                id="cont-sede"
                value={filtroSedeId}
                onChange={(e) => setFiltroSedeId(e.target.value)}
                className="filter-select"
              >
                <option value="">Todas</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
          {tab !== "panel" &&
            tab !== "ganancia" &&
            tab !== "cobros" &&
            !esTabCierre && (
            <div className="filter-group">
              <label htmlFor="cont-semana">Semana</label>
              <input
                id="cont-semana"
                type="number"
                min="1"
                max="53"
                value={filtroSemana}
                onChange={(e) => handleFiltroSemana(e.target.value)}
                className="filter-select"
                style={{ minWidth: 72 }}
              />
            </div>
          )}
          {tab === "cobros" && (
            <>
              <div className="filter-group">
                <label htmlFor="cont-cobros-desde">Desde</label>
                <DatePicker
                  id="cont-cobros-desde"
                  value={fechaInicioCobros}
                  max={fechaFinCobros || hoyISO()}
                  onChange={(e) => setFechaInicioCobros(e.target.value)}
                  className="filter-select"
                />
              </div>
              <div className="filter-group">
                <label htmlFor="cont-cobros-hasta">Hasta</label>
                <DatePicker
                  id="cont-cobros-hasta"
                  value={fechaFinCobros}
                  min={fechaInicioCobros}
                  max={hoyISO()}
                  onChange={(e) => setFechaFinCobros(e.target.value)}
                  className="filter-select"
                />
              </div>
            </>
          )}
          {tab === "panel" && (
            <div className="filter-group">
              <label htmlFor="cont-panel-fecha">Fecha panel</label>
              <DatePicker
                id="cont-panel-fecha"
                max={hoyISO()}
                value={filtroPanelF}
                onChange={(e) => setFiltroPanelFecha(e.target.value)}
                className="filter-select"
              />
            </div>
          )}
          {mostrarBotonRegistrar && (
            <button className="btn-primary" type="button" onClick={abrirNuevo}>
              <span className="material-symbols-outlined">add</span>
              {textoBotonNuevo}
            </button>
          )}
        </div>
      </div>

      <div className="cont-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`cont-tab-btn ${tab === t.key ? "cont-tab-btn--active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span className="material-symbols-outlined">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <Spinner />
      ) : (
        <div className="cont-tab-body">
          {tab === "ingresos" && (
            <IngresosTab
              ingresos={ingresosMapeados}
              sedes={sedes}
              esAdmin={esAdmin}
              onEditar={abrirEditar}
              onEliminar={abrirEliminar}
              resumenSemanal={resumenIngSemanal}
              totalesDia={totalesDiaIng}
            />
          )}

          {tab === "egresos" && (
            <EgresosTab
              egresos={egresosMapeados}
              sedes={sedes}
              esAdmin={esAdmin}
              onEditar={abrirEditar}
              onEliminar={abrirEliminar}
              resumenSemanal={resumenEgrSemanal}
              resumenConcepto={resumenEgrConcepto}
              totalesDia={totalesDiaEgr}
            />
          )}

          {tab === "proveedores" && (
            <ProveedoresTab
              proveedores={proveedoresMap}
              resumenProv={resumenProv}
              resumenSede={resumenSedeAbonos}
              esAdmin={esAdmin}
              saldosDeuda={deudaProveedores}
              onAbonar={abrirAbono}
              onEditar={abrirEditarProv}
              onEliminar={abrirEliminar}
            />
          )}

          {tab === "cobros" && (
            <CobrosEntregadorTab
              cobros={cobrosEntregador}
              fechaInicio={fechaInicioCobros}
              fechaFin={fechaFinCobros}
            />
          )}

          {tab === "cierre-diario" && (
            <CierreCajaTab sedeId={filtroSedeId} esAdmin={esAdmin} modo="diario" />
          )}

          {tab === "cierre-semanal" && (
            <CierreCajaTab sedeId={filtroSedeId} esAdmin={esAdmin} modo="semanal" />
          )}

          {tab === "panel" && !panelGeneral && (
            <EmptyState
              icono="dashboard"
              titulo={`No hay datos del panel general para ${formatFecha(filtroPanelF)}.`}
              detalle="Revisa que existan ingresos, egresos, cartera o stock para la fecha seleccionada."
            />
          )}

          {tab === "panel" && panelGeneral && (
            <PanelGeneralTab
              panelGeneral={{ ...panelGeneral, _sedes: sedes }}
              fecha={filtroPanelF}
              semanaNumero={semanaNumero}
              totalesDiaIngresos={totalesDiaIng}
              totalesDiaEgresos={totalesDiaEgr}
            />
          )}

          {tab === "ganancia" && (
            <GananciaGastoTab
              periodo={periodoGanancia}
              onPeriodoChange={setPeriodoGanancia}
              fechaReferencia={fechaGanancia}
              onFechaReferenciaChange={setFechaGanancia}
              corte={corteCaja}
              cargando={cargandoCorte}
            />
          )}

          {tab === "arqueo" && (
            <ArqueoSemanalTab
              arqueo={arqueo}
              arqueoError={arqueoError}
              filtroSemana={filtroSemana}
              onFiltroSemanaChange={handleFiltroSemana}
              sedes={sedes}
            />
          )}
        </div>
      )}

      <ContabilidadModal
        isOpen={modalOpen}
        onClose={cerrarModal}
        onConfirmar={handleSubmit}
        modalTipo={modalTipo}
        itemEditar={itemEditar}
        form={form}
        onFormChange={handleFormChange}
        totalIngresoForm={totalIngresoForm}
        esAdmin={esAdmin}
        sedes={sedes}
        proveedores={catalogoProveedores}
        errores={erroresForm}
        cargando={cargando}
      />

      <Modal
        isOpen={!!itemEliminar}
        onClose={() => {
          setItemEliminar(null);
          setEliminarTipo("");
        }}
        titulo="Eliminar registro"
        textoBotonConfirmar="Si, eliminar"
        onConfirmar={handleEliminar}
        mostrarCancelar
      >
        <div className="cont-confirm-body">
          <span className="material-symbols-outlined">warning</span>
          <p>¿Eliminar este registro? Esta acción no se puede deshacer.</p>
        </div>
      </Modal>
    </div>
  );
};

export default ContabilidadPage;
