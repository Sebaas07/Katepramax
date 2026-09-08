import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import contabilidadService from "@/services/contabilidad.service";
import reporteService from "@/services/reporte.service";
import inventarioService from "@/services/inventario.service";
import { getSemanaISO, getRangoSemana, formatFecha, hoyISO } from "@/utils/formatters";
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
import CarteraTab from "../CarteraTab";
import ProveedoresTab from "../ProveedoresTab";
import PanelGeneralTab from "../PanelGeneralTab";
import CobrosEntregadorTab from "../CobrosEntregadorTab";
import CierreCajaTab from "../CierreCajaTab";

// ── Shared UI
import { Spinner, EmptyState } from "../ContabilidadUI";
import ContabilidadModal from "../ContabilidadModal";
import Modal from "@/components/common/Modal/Modal";

import "./ContabilidadPage.css";

// ─────────────────────────────────────────────────────────────
const SEM_ACTUAL = getSemanaISO(new Date());

const TABS = [
  { key: "ingresos", label: "Ingresos Diarios", icon: "trending_up" },
  { key: "egresos", label: "Egresos Diarios", icon: "trending_down" },
  { key: "cartera", label: "Cartera", icon: "account_balance" },
  { key: "proveedores", label: "Proveedores", icon: "payments" },
  { key: "cobros", label: "Cobros por Entregador", icon: "delivery_dining" },
  { key: "cierre-diario", label: "Cierre Diario", icon: "today" },
  { key: "cierre-semanal", label: "Cierre Semanal", icon: "date_range" },
  { key: "panel", label: "Panel General", icon: "dashboard" },
];

const TAB_A_MODAL_TIPO = {
  ingresos: "ingreso",
  egresos: "egreso",
  proveedores: "abono",
  cartera: "cartera",
};

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
  const { usuario, esAdmin, esBodega, esOficinista, esAdminBogota, isAuthenticated, isSessionChecked } =
    useAuth();
  const sedeIdUsuario = usuario?.sedeId ?? null;
  const puedeRegistrar = esAdmin || esBodega || esOficinista;
  const puedeRegistrarCartera = esAdmin || esAdminBogota || esOficinista;
  const puedeGestionarMovimientos = esAdmin || esAdminBogota;

  // ── Estado de datos ───────────────────────────────────────
  const [tab, setTab] = useState("ingresos");
  const [cargando, setCargando] = useState(false);
  const [sedes, setSedes] = useState([]);
  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [cartera, setCartera] = useState([]);
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
  const [panelGeneral, setPanelGeneral] = useState(null);
  const [cobrosEntregador, setCobrosEntregador] = useState(null);

  // ── Filtros ───────────────────────────────────────────────
  const [filtroSemana, setFiltroSemana] = useState(String(SEM_ACTUAL));
  const [filtroSedeId, setFiltroSedeId] = useState(() =>
    esAdmin ? "" : sedeIdUsuario ? String(sedeIdUsuario) : "",
  );
  const [vistaMov, setVistaMov] = useState("semana");
  const [filtroDiaMov, setFiltroDiaMov] = useState(() => hoyISO());
  const [filtroPanelF, setFiltroPanelFecha] = useState(() => hoyISO());
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
    if (esTabCierre) {
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const semanaNum = parseInt(filtroSemana, 10) || SEM_ACTUAL;
      const fBase = {
        semana: filtroSemana || undefined,
        // Solo enviamos sedeId si hay un valor real: un string vacío hace que
        // el backend (integers en el querystring) devuelva 400 y rompa la
        // recarga de la tabla tras guardar.
        ...(filtroSedeId ? { sedeId: filtroSedeId } : {}),
      };
      const esDiaMov = tab !== "cartera" && vistaMov === "dia";

      if (tab === "ingresos") {
        if (esDiaMov) {
          const lista = await contabilidadService.obtenerIngresos({
            fecha: filtroDiaMov || undefined,
            sedeId: filtroSedeId || undefined,
          });
          const ingresosDia = lista ?? [];
          setIngresos(ingresosDia);
          const agrupados = new Map();
          ingresosDia.forEach((i) => {
            const sId = i.sedeId;
            const act =
              agrupados.get(sId) ??
              {
                sede: i.sede?.nombre ?? `Sede ${sId}`,
                sedeId: sId,
                registros: 0,
                efectivo: 0,
                cuentas: 0,
                total: 0,
              };
            act.registros += 1;
            act.efectivo += Number(i.efectivo ?? 0);
            act.cuentas += Number(i.cuentas ?? 0);
            act.total += Number(i.total ?? 0);
            agrupados.set(sId, act);
          });
          const porSede = [...agrupados.values()].filter((p) => p.total > 0);
          setResumenIngSemanal({
            porSede,
            totalGeneral: porSede.reduce(
              (acc, p) => ({
                efectivo: acc.efectivo + Number(p.efectivo ?? 0),
                cuentas: acc.cuentas + Number(p.cuentas ?? 0),
                total: acc.total + Number(p.total ?? 0),
              }),
              { efectivo: 0, cuentas: 0, total: 0 },
            ),
          });
          setTotalesDiaIng([]);
        } else {
          const [lista, resSemanal, totDia] = await Promise.all([
            contabilidadService.obtenerIngresos(fBase),
            contabilidadService.obtenerResumenSemanalIngresos(
              semanaNum,
              filtroSedeId || undefined,
            ),
            contabilidadService.obtenerTotalesDiaIngresos(
              semanaNum,
              filtroSedeId || undefined,
            ),
          ]);
          setIngresos(lista);
          setResumenIngSemanal(resSemanal);
          setTotalesDiaIng(totDia);
        }
      } else if (tab === "egresos") {
        if (esDiaMov) {
          const lista = await contabilidadService.obtenerEgresos({
            fecha: filtroDiaMov || undefined,
            sedeId: filtroSedeId || undefined,
          });
          const egresosDia = lista ?? [];
          setEgresos(egresosDia);
          const agrupados = new Map();
          egresosDia.forEach((e) => {
            const sId = e.sedeId;
            const act =
              agrupados.get(sId) ??
              {
                sede: e.sede?.nombre ?? `Sede ${sId}`,
                sedeId: sId,
                registros: 0,
                total: 0,
              };
            act.registros += 1;
            act.total += Number(e.total ?? 0);
            agrupados.set(sId, act);
          });
          setResumenEgrSemanal({
            porSede: [...agrupados.values()].filter((p) => p.total > 0),
            totalGeneral: [...agrupados.values()].reduce(
              (sum, p) => sum + Number(p.total ?? 0),
              0,
            ),
          });
          const porConceptoMap = new Map();
          egresosDia.forEach((e) => {
            const concepto = e.concepto ?? "Sin concepto";
            const act = porConceptoMap.get(concepto) ?? { total: 0, registros: 0 };
            act.total += Number(e.total ?? 0);
            act.registros += 1;
            porConceptoMap.set(concepto, act);
          });
          setResumenEgrConcepto(
            [...porConceptoMap.entries()]
              .map(([concepto, v]) => ({
                concepto,
                registros: v.registros,
                total: v.total,
              }))
              .sort((a, b) => b.total - a.total),
          );
          setTotalesDiaEgr([]);
        } else {
          const [lista, resSemanal, resConcepto, totDia] = await Promise.all([
            contabilidadService.obtenerEgresos(fBase),
            contabilidadService.obtenerResumenSemanalEgresos(
              semanaNum,
              filtroSedeId || undefined,
            ),
            contabilidadService.obtenerResumenConceptoEgresos(
              semanaNum,
              filtroSedeId || undefined,
            ),
            contabilidadService.obtenerTotalesDiaEgresos(
              semanaNum,
              filtroSedeId || undefined,
            ),
          ]);
          setEgresos(lista);
          setResumenEgrSemanal(resSemanal);
          setResumenEgrConcepto(resConcepto);
          setTotalesDiaEgr(totDia);
        }
      } else if (tab === "cartera") {
        setCartera(await contabilidadService.obtenerCartera(fBase));
      } else if (tab === "proveedores") {
        const [lista, resumen, resSede, saldosDeuda] = await Promise.all([
          contabilidadService.listarAbonos(fBase),
          contabilidadService.obtenerResumenProveedores(
            semanaNum,
            filtroSedeId || undefined,
          ),
          contabilidadService.obtenerResumenSedeAbonos(
            semanaNum,
            filtroSedeId || undefined,
          ),
          contabilidadService.obtenerDeudaProveedores(),
        ]);
        setProveedores(lista);
        setResumenProv(resumen);
        setResumenSedeAbonos(resSede);
        setDeudaProveedores(saldosDeuda);
      } else if (tab === "panel") {
        const panel = await contabilidadService.obtenerPanelGeneral(filtroPanelF);
        setPanelGeneral(panel);
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
  }, [tab, esTabCierre, filtroSemana, filtroSedeId, filtroPanelF, filtroDiaMov, vistaMov, fechaInicioCobros, fechaFinCobros, esAdmin]);

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

  // ── Corte de caja (Cierre Diario / Semanal) ────────────────
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

  // El catálogo GET /proveedores devuelve [{ id, nombre, ... }]; el selector de
  // abonos en ContabilidadModal espera [{ proveedorId, proveedor }].
  const proveedoresSelect = useMemo(
    () =>
      catalogoProveedores.map((p) => ({
        proveedorId: Number(p.id),
        proveedor: p.nombre,
      })),
    [catalogoProveedores],
  );

  const totalIngresoForm = useMemo(
    () => (parseFloat(form.efectivo) || 0) + (parseFloat(form.cuentas) || 0),
    [form.efectivo, form.cuentas],
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
      const semanaGuardada = String(payload.semana ?? SEM_ACTUAL);
      if (semanaGuardada !== filtroSemana) {
        // Semana distinta a la de pantalla (p. ej. tras el reinicio del
        // periodo el 7 de septiembre): el efecto recarga con la semana nueva.
        setFiltroSemana(semanaGuardada);
      } else {
        // Misma semana: recarga explícita. setState con un valor igual no
        // dispara el efecto, por eso la tabla se quedaba sin actualizar.
        await cargarDatos();
      }
    } catch (err) {
      toast.error(err?.message || "No fue posible guardar el registro.");
    } finally {
      setCargando(false);
    }
  }, [modalTipo, itemEditar, form, cargarDatos, filtroSemana]);

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
    tab === "cartera"
      ? puedeRegistrarCartera
      : puedeRegistrar && ["ingresos", "egresos", "proveedores"].includes(tab);

  const textoBotonNuevo =
    {
      ingresos: "Nuevo ingreso",
      egresos: "Nuevo egreso",
      proveedores: "Registrar abono",
      cartera: "Registrar saldo",
    }[tab] ?? "Nuevo";

  const subtituloHeader =
    tab === "panel"
      ? formatFecha(filtroPanelF)
      : tab === "cierre-diario"
        ? "Cierre de caja del día"
        : tab === "cierre-semanal"
          ? "Cierre de caja de la semana"
          : tab === "cobros"
            ? `${formatFecha(fechaInicioCobros)} — ${formatFecha(fechaFinCobros)}`
            : tab === "ingresos" || tab === "egresos"
              ? vistaMov === "dia"
                ? `Día ${formatFecha(filtroDiaMov)}`
                : `Semana ${filtroSemana || SEM_ACTUAL}`
              : `Semana ${filtroSemana || SEM_ACTUAL}`;

  return (
    <div className="cont-page">
      <div className="cont-page__header">
        <div>
          <h1 className="cont-page__title">Contabilidad</h1>
          <p className="cont-subtitulo">{subtituloHeader}</p>
        </div>
        <div className="cont-page__acciones">
          {esAdmin && tab !== "panel" && (
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
          {(tab === "ingresos" || tab === "egresos") && (
            <>
              <div className="filter-group">
                <label htmlFor="cont-vista-mov">Vista</label>
                <div
                  className="cont-vista-toggle"
                  role="group"
                  aria-label="Vista de movimientos"
                >
                  <button
                    type="button"
                    className={`cont-vista-btn ${vistaMov === "dia" ? "cont-vista-btn--active" : ""}`}
                    onClick={() => setVistaMov("dia")}
                  >
                    Día
                  </button>
                  <button
                    type="button"
                    className={`cont-vista-btn ${vistaMov === "semana" ? "cont-vista-btn--active" : ""}`}
                    onClick={() => setVistaMov("semana")}
                  >
                    Semana
                  </button>
                </div>
              </div>
              {vistaMov === "dia" ? (
                <div className="filter-group">
                  <label htmlFor="cont-dia-mov">Día</label>
                  <DatePicker
                    id="cont-dia-mov"
                    max={hoyISO()}
                    value={filtroDiaMov}
                    onChange={(e) => setFiltroDiaMov(e.target.value)}
                    className="filter-select"
                  />
                </div>
              ) : (
                <div className="filter-group">
                  <label htmlFor="cont-semana">Semana</label>
                  <select
                    id="cont-semana"
                    value={filtroSemana}
                    onChange={(e) => handleFiltroSemana(e.target.value)}
                    className="filter-select filter-select--week"
                  >
                    {Array.from({ length: 53 }, (_, index) => index + 1).map(
                      (semana) => (
                        <option key={semana} value={semana}>
                          Semana {semana}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              )}
            </>
          )}
          {(tab === "proveedores" || tab === "cartera") && (
            <div className="filter-group">
              <label htmlFor="cont-semana">Semana</label>
              <select
                id="cont-semana"
                value={filtroSemana}
                onChange={(e) => handleFiltroSemana(e.target.value)}
                className="filter-select filter-select--week"
              >
                {Array.from({ length: 53 }, (_, index) => index + 1).map(
                  (semana) => (
                    <option key={semana} value={semana}>
                      Semana {semana}
                    </option>
                  ),
                )}
              </select>
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
              esAdmin={puedeGestionarMovimientos}
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
              esAdmin={puedeGestionarMovimientos}
              onEditar={abrirEditar}
              onEliminar={abrirEliminar}
              resumenSemanal={resumenEgrSemanal}
              resumenConcepto={resumenEgrConcepto}
              totalesDia={totalesDiaEgr}
            />
          )}

          {tab === "cartera" && (
            <CarteraTab
              cartera={cartera}
              sedes={sedes}
              esAdmin={puedeGestionarMovimientos}
              onEditar={abrirEditar}
              onEliminar={abrirEliminar}
            />
          )}

          {tab === "proveedores" && (
            <ProveedoresTab
              proveedores={proveedoresMap}
              resumenProv={resumenProv}
              resumenSede={resumenSedeAbonos}
              esAdmin={puedeGestionarMovimientos}
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
        proveedores={proveedoresSelect}
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
