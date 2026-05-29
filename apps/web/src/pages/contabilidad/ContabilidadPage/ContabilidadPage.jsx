import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import contabilidadService from "@/services/contabilidad.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import { formatCOP, formatFecha, getSemanaISO } from "@/utils/formatters";
import "./ContabilidadPage.css";

// ─── Constantes ───────────────────────────────────────────────
const HOY       = new Date().toISOString().split("T")[0];
const SEM_ACTUAL = getSemanaISO(new Date());

const SEDES = [
  { id: 1, nombre: "Bogotá"        },
  { id: 2, nombre: "Cartagena"     },
  { id: 3, nombre: "Villavicencio" },
];

const TABS = [
  { key: "ingresos",  label: "Ingresos",        icon: "trending_up"      },
  { key: "egresos",   label: "Egresos",          icon: "trending_down"    },
  { key: "cartera",   label: "Cartera",          icon: "account_balance"  },
  { key: "arqueo",    label: "Arqueo Semanal",   icon: "summarize"        },
];

// ─── Spinner ──────────────────────────────────────────────────
const Spinner = () => (
  <div className="cont-spinner-wrap">
    <div className="cont-spinner" />
    <span>Cargando...</span>
  </div>
);

// ─── Tarjeta resumen del día (usada en Ingresos y Egresos) ────
const TarjetaResumen = ({ titulo, icono, color, filas, total }) => (
  <div className="cont-resumen-card" style={{ "--card-color": color }}>
    <div className="cont-resumen-card__header">
      <span className="material-symbols-outlined">{icono}</span>
      <h4>{titulo}</h4>
    </div>
    <div className="cont-resumen-card__filas">
      {filas.map((f, i) => (
        <div key={i} className="cont-resumen-card__fila">
          <span className="cont-resumen-card__sede">{f.sede}</span>
          <span className="cont-resumen-card__valor">{formatCOP(f.valor)}</span>
        </div>
      ))}
    </div>
    <div className="cont-resumen-card__total">
      <span>Total</span>
      <span>{formatCOP(total)}</span>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════
const ContabilidadPage = () => {
  const { usuario, esAdmin, esBodega } = useAuth();
  const sedeIdUsuario = usuario?.sedeId ?? null;
  const puedeRegistrar = esAdmin || esBodega;

  const [tab,      setTab]      = useState("ingresos");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Datos
  const [ingresos,  setIngresos]  = useState([]);
  const [egresos,   setEgresos]   = useState([]);
  const [cartera,   setCartera]   = useState([]);
  const [arqueo,    setArqueo]    = useState(null);

  // Filtros
  const [filtroSemana, setFiltroSemana] = useState(String(SEM_ACTUAL));
  const [filtroSedeId, setFiltroSedeId] = useState(
    sedeIdUsuario ? String(sedeIdUsuario) : ""
  );

  // Modales
  const [modalIngAbierto,  setModalIngAbierto]  = useState(false);
  const [modalEgrAbierto,  setModalEgrAbierto]  = useState(false);
  const [modalCartAbierto, setModalCartAbierto] = useState(false);
  const [modalConfirmAbierto, setModalConfirmAbierto] = useState(false);
  const [itemParaEliminar, setItemParaEliminar] = useState(null);
  const [tipoEliminar,     setTipoEliminar]     = useState("");
  const [itemEditar,       setItemEditar]       = useState(null);

  // Forms
  const [formIng, setFormIng] = useState({
    fecha: HOY, sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
    efectivo: "", cuentas: "", observacion: "",
  });
  const [formEgr, setFormEgr] = useState({
    fecha: HOY, sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
    concepto: "Gastos", total: "", observaciones: "",
  });
  const [formCart, setFormCart] = useState({
    fecha: HOY, sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
    saldoDia: "",
  });

  // ── Carga según tab ────────────────────────────────────────
  const filtrosBase = {
    semana: filtroSemana || undefined,
    sedeId: filtroSedeId || undefined,
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      if (tab === "ingresos") {
        setIngresos(await contabilidadService.obtenerIngresos(filtrosBase));
      } else if (tab === "egresos") {
        setEgresos(await contabilidadService.obtenerEgresos(filtrosBase));
      } else if (tab === "cartera") {
        setCartera(await contabilidadService.obtenerCartera(filtrosBase));
      } else if (tab === "arqueo") {
        setArqueo(await contabilidadService.obtenerArqueo(parseInt(filtroSemana) || SEM_ACTUAL));
      }
    } catch (err) {
      toast.error("Error al cargar datos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [tab, filtroSemana, filtroSedeId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Total calculado en tiempo real (Ingresos) ──────────────
  const totalIngreso = (parseFloat(formIng.efectivo) || 0) +
                       (parseFloat(formIng.cuentas)  || 0);

  // ── Resúmenes del día para tarjetas ───────────────────────
  const resumenIngresos = SEDES.map((s) => ({
    sede:  s.nombre,
    valor: ingresos
      .filter((i) => i.sedeId === s.id)
      .reduce((sum, i) => sum + (i.total ?? 0), 0),
  }));
  const totalIngresos = resumenIngresos.reduce((s, r) => s + r.valor, 0);

  const resumenEgresos = SEDES.map((s) => ({
    sede:  s.nombre,
    valor: egresos
      .filter((e) => e.sedeId === s.id)
      .reduce((sum, e) => sum + (e.total ?? 0), 0),
  }));
  const totalEgresos = resumenEgresos.reduce((s, r) => s + r.valor, 0);

  const resumenCartera = SEDES.map((s) => {
    const reg = [...cartera]
      .filter((c) => c.sedeId === s.id)
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
    return { sede: s.nombre, valor: reg?.saldoDia ?? 0 };
  });
  const totalCartera = resumenCartera.reduce((s, r) => s + r.valor, 0);

  // ── Handlers genéricos ─────────────────────────────────────
  const hIng  = (e) => setFormIng((p)  => ({ ...p, [e.target.name]: e.target.value }));
  const hEgr  = (e) => setFormEgr((p)  => ({ ...p, [e.target.name]: e.target.value }));
  const hCart = (e) => setFormCart((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ── Guardar Ingreso ────────────────────────────────────────
  const handleGuardarIngreso = async () => {
    setGuardando(true);
    try {
      if (itemEditar) {
        await contabilidadService.editarIngreso(itemEditar.id, {
          efectivo:    parseFloat(formIng.efectivo) || 0,
          cuentas:     parseFloat(formIng.cuentas)  || 0,
          observacion: formIng.observacion,
        });
        toast.success("Ingreso actualizado.");
      } else {
        await contabilidadService.registrarIngreso(formIng);
        toast.success("Ingreso registrado.");
      }
      setModalIngAbierto(false);
      setItemEditar(null);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Guardar Egreso ─────────────────────────────────────────
  const handleGuardarEgreso = async () => {
    setGuardando(true);
    try {
      if (itemEditar) {
        await contabilidadService.editarEgreso(itemEditar.id, {
          concepto:     formEgr.concepto,
          total:        parseFloat(formEgr.total) || 0,
          observaciones: formEgr.observaciones,
        });
        toast.success("Egreso actualizado.");
      } else {
        await contabilidadService.registrarEgreso(formEgr);
        toast.success("Egreso registrado.");
      }
      setModalEgrAbierto(false);
      setItemEditar(null);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Guardar Cartera ────────────────────────────────────────
  const handleGuardarCartera = async () => {
    setGuardando(true);
    try {
      await contabilidadService.registrarCartera(formCart);
      toast.success("Cartera registrada.");
      setModalCartAbierto(false);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar ───────────────────────────────────────────────
  const abrirConfirmEliminar = (item, tipo) => {
    setItemParaEliminar(item);
    setTipoEliminar(tipo);
    setModalConfirmAbierto(true);
  };

  const handleEliminar = async () => {
    setGuardando(true);
    try {
      if (tipoEliminar === "ingreso")
        await contabilidadService.eliminarIngreso(itemParaEliminar.id);
      else if (tipoEliminar === "egreso")
        await contabilidadService.eliminarEgreso(itemParaEliminar.id);
      toast.success("Registro eliminado.");
      setModalConfirmAbierto(false);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Editar ─────────────────────────────────────────────────
  const abrirEditar = (item, tipo) => {
    setItemEditar(item);
    if (tipo === "ingreso") {
      setFormIng({
        fecha:       item.fecha?.split("T")[0] ?? HOY,
        sedeId:      String(item.sedeId),
        efectivo:    String(item.efectivo ?? ""),
        cuentas:     String(item.cuentas  ?? ""),
        observacion: item.observacion ?? "",
      });
      setModalIngAbierto(true);
    } else if (tipo === "egreso") {
      setFormEgr({
        fecha:         item.fecha?.split("T")[0] ?? HOY,
        sedeId:        String(item.sedeId),
        concepto:      item.concepto ?? "Gastos",
        total:         String(item.total ?? ""),
        observaciones: item.observaciones ?? "",
      });
      setModalEgrAbierto(true);
    }
  };

  // ── Columnas ───────────────────────────────────────────────
  const colsIngresos = [
    { campo: "fecha",      label: "Fecha",     tipo: "fecha"  },
    { campo: "semana",     label: "Sem.",       tipo: "texto"  },
    { campo: "sede",       label: "Sede",       tipo: "texto"  },
    { campo: "efectivo",   label: "Efectivo",   tipo: "moneda" },
    { campo: "cuentas",    label: "Cuentas",    tipo: "moneda" },
    { campo: "total",      label: "Total",      tipo: "moneda" },
    { campo: "observacion",label: "Obs.",       tipo: "texto"  },
  ];

  const colsEgresos = [
    { campo: "fecha",         label: "Fecha",    tipo: "fecha"  },
    { campo: "semana",        label: "Sem.",      tipo: "texto"  },
    { campo: "sede",          label: "Sede",      tipo: "texto"  },
    { campo: "concepto",      label: "Concepto",  tipo: "texto"  },
    { campo: "total",         label: "Total",     tipo: "moneda" },
    { campo: "observaciones", label: "Obs.",      tipo: "texto"  },
  ];

  const colsCartera = [
    { campo: "fecha",         label: "Fecha",          tipo: "fecha"  },
    { campo: "semana",        label: "Sem.",            tipo: "texto"  },
    { campo: "sede",          label: "Sede",            tipo: "texto"  },
    { campo: "saldoDia",      label: "Saldo del Día",   tipo: "moneda" },
    { campo: "saldoAnterior", label: "Saldo Anterior",  tipo: "moneda" },
    { campo: "variacion",     label: "Variación",       tipo: "moneda" },
  ];

  // Mapear nombre de sede a datos
  const mapSede = (items) =>
    items.map((i) => ({
      ...i,
      sede: SEDES.find((s) => s.id === i.sedeId)?.nombre ?? `Sede ${i.sedeId}`,
    }));

  // Acciones de tabla
  const accsIngresos = esAdmin
    ? (row) => [
        { label: "Editar",    icon: "edit",   onClick: () => abrirEditar(row, "ingreso") },
        { label: "Eliminar",  icon: "delete", variante: "danger",
          onClick: () => abrirConfirmEliminar(row, "ingreso") },
      ]
    : undefined;

  const accsEgresos = esAdmin
    ? (row) => [
        { label: "Editar",   icon: "edit",   onClick: () => abrirEditar(row, "egreso") },
        { label: "Eliminar", icon: "delete", variante: "danger",
          onClick: () => abrirConfirmEliminar(row, "egreso") },
      ]
    : undefined;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="cont-page">
      {/* Header */}
      <div className="page-header">
        <h1>Contabilidad</h1>

        {/* Filtros globales */}
        <div className="filters">
          {esAdmin && (
            <div className="filter-group">
              <label htmlFor="cont-sede">Sede</label>
              <select
                id="cont-sede"
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
          <div className="filter-group">
            <label htmlFor="cont-semana">Semana</label>
            <input
              id="cont-semana"
              type="number"
              min="1" max="53"
              value={filtroSemana}
              onChange={(e) => setFiltroSemana(e.target.value)}
              className="filter-select"
              style={{ minWidth: 72 }}
            />
          </div>

          {/* Botón según tab activo */}
          {puedeRegistrar && tab !== "arqueo" && (
            <button
              className="btn-primary"
              type="button"
              onClick={() => {
                setItemEditar(null);
                if (tab === "ingresos") {
                  setFormIng({ fecha: HOY, sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
                    efectivo: "", cuentas: "", observacion: "" });
                  setModalIngAbierto(true);
                } else if (tab === "egresos") {
                  setFormEgr({ fecha: HOY, sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
                    concepto: "Gastos", total: "", observaciones: "" });
                  setModalEgrAbierto(true);
                } else if (tab === "cartera") {
                  setFormCart({ fecha: HOY, sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "",
                    saldoDia: "" });
                  setModalCartAbierto(true);
                }
              }}
            >
              <span className="material-symbols-outlined">add</span>
              {tab === "ingresos" ? "Registrar ingreso"
                : tab === "egresos" ? "Registrar egreso"
                : "Registrar cartera"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="cont-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "tab-active" : "tab-btn"}
            onClick={() => setTab(t.key)}
          >
            <span className="material-symbols-outlined">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {cargando ? <Spinner /> : (
        <>
          {/* ── INGRESOS ── */}
          {tab === "ingresos" && (
            <div className="cont-tab-body">
              {/* Tarjetas resumen */}
              {totalIngresos > 0 && (
                <div className="cont-resumen-row">
                  <TarjetaResumen
                    titulo="Efectivo"
                    icono="payments"
                    color="var(--secondary)"
                    filas={SEDES.map((s) => ({
                      sede: s.nombre,
                      valor: ingresos.filter((i) => i.sedeId === s.id)
                               .reduce((sum, i) => sum + (i.efectivo ?? 0), 0),
                    }))}
                    total={ingresos.reduce((s, i) => s + (i.efectivo ?? 0), 0)}
                  />
                  <TarjetaResumen
                    titulo="Cuentas / Transferencias"
                    icono="account_balance"
                    color="#60a5fa"
                    filas={SEDES.map((s) => ({
                      sede: s.nombre,
                      valor: ingresos.filter((i) => i.sedeId === s.id)
                               .reduce((sum, i) => sum + (i.cuentas ?? 0), 0),
                    }))}
                    total={ingresos.reduce((s, i) => s + (i.cuentas ?? 0), 0)}
                  />
                  <TarjetaResumen
                    titulo="Total Ingresos"
                    icono="trending_up"
                    color="#4ade80"
                    filas={resumenIngresos}
                    total={totalIngresos}
                  />
                </div>
              )}
              <div className="tab-content">
                <TablaGenerica
                  columnas={colsIngresos}
                  datos={mapSede(ingresos)}
                  filasPorPagina={10}
                  mostrarBuscador
                  buscarEnCampos={["sede", "observacion"]}
                  paginacion
                  renderAcciones={accsIngresos}
                />
              </div>
            </div>
          )}

          {/* ── EGRESOS ── */}
          {tab === "egresos" && (
            <div className="cont-tab-body">
              {totalEgresos > 0 && (
                <div className="cont-resumen-row">
                  <TarjetaResumen
                    titulo="Total Egresos"
                    icono="trending_down"
                    color="var(--error)"
                    filas={resumenEgresos}
                    total={totalEgresos}
                  />
                </div>
              )}
              <div className="tab-content">
                <TablaGenerica
                  columnas={colsEgresos}
                  datos={mapSede(egresos)}
                  filasPorPagina={10}
                  mostrarBuscador
                  buscarEnCampos={["sede", "concepto", "observaciones"]}
                  paginacion
                  renderAcciones={accsEgresos}
                />
              </div>
            </div>
          )}

          {/* ── CARTERA ── */}
          {tab === "cartera" && (
            <div className="cont-tab-body">
              {totalCartera > 0 && (
                <div className="cont-resumen-row">
                  <TarjetaResumen
                    titulo="Cartera Actual por Sede"
                    icono="account_balance"
                    color="#ddb7ff"
                    filas={resumenCartera}
                    total={totalCartera}
                  />
                </div>
              )}
              <div className="tab-content">
                <TablaGenerica
                  columnas={colsCartera}
                  datos={mapSede(cartera)}
                  filasPorPagina={10}
                  mostrarBuscador
                  buscarEnCampos={["sede"]}
                  paginacion
                />
              </div>
            </div>
          )}

          {/* ── ARQUEO SEMANAL ── */}
          {tab === "arqueo" && (
            <div className="cont-tab-body">
              {!arqueo ? (
                <div className="cont-empty">
                  <span className="material-symbols-outlined">summarize</span>
                  <p>No hay datos de arqueo para la semana {filtroSemana}.</p>
                </div>
              ) : (
                <div className="cont-arqueo">
                  <div className="cont-arqueo-header">
                    <h2>Arqueo Semana {arqueo.semana ?? filtroSemana}</h2>
                    {arqueo.fechaInicio && arqueo.fechaFin && (
                      <span className="cont-arqueo-rango">
                        {formatFecha(arqueo.fechaInicio)} → {formatFecha(arqueo.fechaFin)}
                      </span>
                    )}
                  </div>

                  {/* Bloque 1 — Ingresos */}
                  <ArqueoBloque
                    numero={1}
                    titulo="Ingresos de la Semana"
                    columnas={["Sede", "Efectivo", "Cuentas", "Total Semana"]}
                    filas={(arqueo.ingresos ?? []).map((r) => [
                      r.sede, formatCOP(r.efectivo), formatCOP(r.cuentas), formatCOP(r.total),
                    ])}
                    totalFila={[
                      "TOTAL",
                      formatCOP(arqueo.ingresos?.reduce((s, r) => s + (r.efectivo ?? 0), 0)),
                      formatCOP(arqueo.ingresos?.reduce((s, r) => s + (r.cuentas  ?? 0), 0)),
                      formatCOP(arqueo.ingresos?.reduce((s, r) => s + (r.total    ?? 0), 0)),
                    ]}
                  />

                  {/* Bloque 2 — Egresos */}
                  <ArqueoBloque
                    numero={2}
                    titulo="Egresos de la Semana"
                    columnas={["Sede", "Egresos", "Proveedores", "Total"]}
                    filas={(arqueo.egresos ?? []).map((r) => [
                      r.sede, formatCOP(r.egresos), formatCOP(r.proveedores),
                      formatCOP((r.egresos ?? 0) + (r.proveedores ?? 0)),
                    ])}
                    totalFila={[
                      "TOTAL",
                      formatCOP(arqueo.egresos?.reduce((s, r) => s + (r.egresos      ?? 0), 0)),
                      formatCOP(arqueo.egresos?.reduce((s, r) => s + (r.proveedores  ?? 0), 0)),
                      formatCOP(arqueo.egresos?.reduce((s, r) =>
                        s + (r.egresos ?? 0) + (r.proveedores ?? 0), 0)),
                    ]}
                  />

                  {/* Bloque 3 — Saldo Neto */}
                  <ArqueoBloque
                    numero={3}
                    titulo="Saldo Neto (Ingresos − Egresos)"
                    columnas={["Sede", "Ingresos", "Egresos", "Saldo Neto"]}
                    filas={(arqueo.saldoNeto ?? []).map((r) => [
                      r.sede, formatCOP(r.ingresos), formatCOP(r.egresos),
                      formatCOP(r.saldoNeto),
                    ])}
                    totalFila={[
                      "TOTAL",
                      formatCOP(arqueo.saldoNeto?.reduce((s, r) => s + (r.ingresos  ?? 0), 0)),
                      formatCOP(arqueo.saldoNeto?.reduce((s, r) => s + (r.egresos   ?? 0), 0)),
                      formatCOP(arqueo.saldoNeto?.reduce((s, r) => s + (r.saldoNeto ?? 0), 0)),
                    ]}
                  />

                  {/* Bloque 4 — Proveedores */}
                  <ArqueoBloque
                    numero={4}
                    titulo="Proveedores de la Semana"
                    columnas={["Concepto", "Valor"]}
                    filas={[
                      ["Deuda registrada en la semana",  formatCOP(arqueo.proveedores?.deuda)],
                      ["Pagado en la semana",             formatCOP(arqueo.proveedores?.pagado)],
                      ["Saldo pendiente",                 formatCOP(arqueo.proveedores?.pendiente)],
                    ]}
                  />

                  {/* Bloque 5 — Cartera */}
                  <ArqueoBloque
                    numero={5}
                    titulo="Variación de Cartera en la Semana"
                    columnas={["Sede", "Saldo Inicio", "Saldo Cierre"]}
                    filas={(arqueo.cartera ?? []).map((r) => [
                      r.sede, formatCOP(r.saldoInicio), formatCOP(r.saldoCierre),
                    ])}
                    totalFila={[
                      "TOTAL",
                      formatCOP(arqueo.cartera?.reduce((s, r) => s + (r.saldoInicio ?? 0), 0)),
                      formatCOP(arqueo.cartera?.reduce((s, r) => s + (r.saldoCierre ?? 0), 0)),
                    ]}
                  />

                  {/* Bloque 6 — Inventario */}
                  <ArqueoBloque
                    numero={6}
                    titulo="Variación de Inventario en la Semana"
                    columnas={["Sede", "Cant. Cierre", "Costo Cierre"]}
                    filas={(arqueo.inventario ?? []).map((r) => [
                      r.sede,
                      new Intl.NumberFormat("es-CO").format(r.cantCierre ?? 0),
                      formatCOP(r.costoCierre),
                    ])}
                    totalFila={[
                      "TOTAL",
                      new Intl.NumberFormat("es-CO").format(
                        arqueo.inventario?.reduce((s, r) => s + (r.cantCierre ?? 0), 0)
                      ),
                      formatCOP(arqueo.inventario?.reduce((s, r) => s + (r.costoCierre ?? 0), 0)),
                    ]}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══ MODALES ══════════════════════════════════════════*/}

      {/* Modal — Ingreso */}
      <Modal
        isOpen={modalIngAbierto}
        onClose={() => { setModalIngAbierto(false); setItemEditar(null); }}
        titulo={itemEditar ? "Editar Ingreso" : "Registrar Ingreso"}
        textoBotonConfirmar={guardando ? "Guardando..." : "Guardar"}
        onConfirmar={handleGuardarIngreso}
        mostrarCancelar
      >
        <div className="modal-form">
          {/* Fecha */}
          {!itemEditar && (
            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" name="fecha" value={formIng.fecha}
                onChange={hIng} className="form-control" max={HOY} />
            </div>
          )}

          {/* Sede */}
          {esAdmin && !itemEditar && (
            <div className="form-group">
              <label>Sede *</label>
              <select name="sedeId" value={formIng.sedeId}
                onChange={hIng} className="form-control">
                <option value="">— Selecciona —</option>
                {SEDES.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Efectivo */}
          <div className="form-group">
            <label>Efectivo (COP)</label>
            <input type="number" name="efectivo" value={formIng.efectivo}
              onChange={hIng} className="form-control" min="0" step="1000" placeholder="0" />
          </div>

          {/* Cuentas */}
          <div className="form-group">
            <label>Cuentas / Transferencias (COP)</label>
            <input type="number" name="cuentas" value={formIng.cuentas}
              onChange={hIng} className="form-control" min="0" step="1000" placeholder="0" />
          </div>

          {/* Total calculado */}
          <div className="cont-total-calculado">
            <span>Total</span>
            <span className="cont-total-valor">{formatCOP(totalIngreso)}</span>
          </div>

          {/* Observaciones */}
          <div className="form-group">
            <label>Observaciones (opcional)</label>
            <input type="text" name="observacion" value={formIng.observacion}
              onChange={hIng} className="form-control"
              placeholder="Ej: Ingreso dominical, cobro cartera..." />
          </div>
        </div>
      </Modal>

      {/* Modal — Egreso */}
      <Modal
        isOpen={modalEgrAbierto}
        onClose={() => { setModalEgrAbierto(false); setItemEditar(null); }}
        titulo={itemEditar ? "Editar Egreso" : "Registrar Egreso"}
        textoBotonConfirmar={guardando ? "Guardando..." : "Guardar"}
        onConfirmar={handleGuardarEgreso}
        mostrarCancelar
      >
        <div className="modal-form">
          {!itemEditar && (
            <div className="form-group">
              <label>Fecha *</label>
              <input type="date" name="fecha" value={formEgr.fecha}
                onChange={hEgr} className="form-control" max={HOY} />
            </div>
          )}
          {esAdmin && !itemEditar && (
            <div className="form-group">
              <label>Sede *</label>
              <select name="sedeId" value={formEgr.sedeId}
                onChange={hEgr} className="form-control">
                <option value="">— Selecciona —</option>
                {SEDES.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Concepto *</label>
            <input type="text" name="concepto" value={formEgr.concepto}
              onChange={hEgr} className="form-control"
              placeholder="Gastos, Salarios, Arriendo..." />
          </div>
          <div className="form-group">
            <label>Total (COP) *</label>
            <input type="number" name="total" value={formEgr.total}
              onChange={hEgr} className="form-control" min="0" step="1000" placeholder="0" />
            {formEgr.total && (
              <span className="cont-preview-cop">{formatCOP(formEgr.total)}</span>
            )}
          </div>
          {/* Observaciones como textarea — pueden ser largas (salarios, arriendos) */}
          <div className="form-group">
            <label>Observaciones (opcional)</label>
            <textarea name="observaciones" value={formEgr.observaciones}
              onChange={hEgr} className="form-control" rows={3}
              placeholder="Ej: SUELDO POLLO Y PAGO NUÑEZ, ARRIENDO, SUBSIDIOS STARLINK..." />
          </div>
        </div>
      </Modal>

      {/* Modal — Cartera */}
      <Modal
        isOpen={modalCartAbierto}
        onClose={() => setModalCartAbierto(false)}
        titulo="Registrar Cartera"
        textoBotonConfirmar={guardando ? "Guardando..." : "Guardar"}
        onConfirmar={handleGuardarCartera}
        mostrarCancelar
      >
        <div className="modal-form">
          <div className="form-group">
            <label>Fecha *</label>
            <input type="date" name="fecha" value={formCart.fecha}
              onChange={hCart} className="form-control" max={HOY} />
          </div>
          {esAdmin && (
            <div className="form-group">
              <label>Sede *</label>
              <select name="sedeId" value={formCart.sedeId}
                onChange={hCart} className="form-control">
                <option value="">— Selecciona —</option>
                {SEDES.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          )}
          <div className="form-group">
            <label>Saldo del Día (COP) *</label>
            <input type="number" name="saldoDia" value={formCart.saldoDia}
              onChange={hCart} className="form-control" min="0" step="1000" placeholder="0" />
            {formCart.saldoDia && (
              <span className="cont-preview-cop">{formatCOP(formCart.saldoDia)}</span>
            )}
          </div>
          <div className="cont-cartera-nota">
            <span className="material-symbols-outlined">info</span>
            <p>Solo ingresa el saldo del día. La variación respecto al día anterior
               se calcula automáticamente.</p>
          </div>
        </div>
      </Modal>

      {/* Modal — Confirmar eliminar */}
      <Modal
        isOpen={modalConfirmAbierto}
        onClose={() => setModalConfirmAbierto(false)}
        titulo="Eliminar registro"
        textoBotonConfirmar={guardando ? "Eliminando..." : "Sí, eliminar"}
        onConfirmar={handleEliminar}
        mostrarCancelar
      >
        <div className="cont-confirm-body">
          <span className="material-symbols-outlined cont-confirm-icon">warning</span>
          <p>¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.</p>
        </div>
      </Modal>
    </div>
  );
};

// ─── Bloque de arqueo ─────────────────────────────────────────
const ArqueoBloque = ({ numero, titulo, columnas, filas, totalFila }) => (
  <div className="arqueo-bloque">
    <h3 className="arqueo-bloque__titulo">
      <span className="arqueo-bloque__num">{numero}</span>
      {titulo}
    </h3>
    <div className="table-responsive">
      <table className="arqueo-tabla">
        <thead>
          <tr>{columnas.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i}>{fila.map((celda, j) => <td key={j}>{celda ?? "—"}</td>)}</tr>
          ))}
          {totalFila && (
            <tr className="arqueo-tabla__total">
              {totalFila.map((c, i) => <td key={i}>{c}</td>)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default ContabilidadPage;
