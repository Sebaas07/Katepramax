import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import contabilidadService from "@/services/contabilidad.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import { formatCOP, formatFecha, getSemanaISO } from "@/utils/formatters";
import "./ContabilidadPage.css";

// ─── Constantes ───────────────────────────────────────────────
const HOY        = new Date().toISOString().split("T")[0];
const SEM_ACTUAL = getSemanaISO(new Date());

const SEDES = [
  { id: 1, nombre: "Bogotá"        },
  { id: 2, nombre: "Cartagena"     },
  { id: 3, nombre: "Villavicencio" },
];

const TABS = [
  { key: "ingresos",  label: "Ingresos",      icon: "trending_up"    },
  { key: "egresos",   label: "Egresos",        icon: "trending_down"  },
  { key: "cartera",   label: "Cartera",        icon: "account_balance"},
  { key: "arqueo",    label: "Arqueo Semanal", icon: "summarize"      },
];

// ─── Spinner ──────────────────────────────────────────────────
const Spinner = () => (
  <div className="cont-spinner-wrap">
    <div className="cont-spinner" />
    <span>Cargando...</span>
  </div>
);

// ─── Tarjeta resumen ──────────────────────────────────────────
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
            <tr key={i}>
              {fila.map((celda, j) => <td key={j}>{celda ?? "—"}</td>)}
            </tr>
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

// ═══════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════
const ContabilidadPage = () => {
  const { usuario, esAdmin, esBodega } = useAuth();
  const sedeIdUsuario  = usuario?.sedeId ?? null;
  const puedeRegistrar = esAdmin || esBodega;

  // ── Estado ─────────────────────────────────────────────────
  const [tab,      setTab]      = useState("ingresos");
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [ingresos, setIngresos] = useState([]);
  const [egresos,  setEgresos]  = useState([]);
  const [cartera,  setCartera]  = useState([]);
  const [arqueo,   setArqueo]   = useState(null);

  // Filtros
  const [filtroSemana, setFiltroSemana] = useState(String(SEM_ACTUAL));
  const [filtroSedeId, setFiltroSedeId] = useState(
    sedeIdUsuario ? String(sedeIdUsuario) : ""
  );

  // Modales
  const [modalIngAbierto,     setModalIngAbierto]     = useState(false);
  const [modalEgrAbierto,     setModalEgrAbierto]     = useState(false);
  const [modalCartAbierto,    setModalCartAbierto]    = useState(false);
  const [modalConfirmAbierto, setModalConfirmAbierto] = useState(false);
  const [itemEditar,          setItemEditar]          = useState(null);
  const [itemEliminar,        setItemEliminar]        = useState(null);
  const [tipoEliminar,        setTipoEliminar]        = useState("");

  // Forms
  const formIngInicial  = { fecha: HOY, sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "", efectivo: "", cuentas: "", observacion: "" };
  const formEgrInicial  = { fecha: HOY, sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "", concepto: "", total: "", observaciones: "" };
  const formCartInicial = { fecha: HOY, sedeId: sedeIdUsuario ? String(sedeIdUsuario) : "", saldoDia: "" };

  const [formIng,  setFormIng]  = useState(formIngInicial);
  const [formEgr,  setFormEgr]  = useState(formEgrInicial);
  const [formCart, setFormCart] = useState(formCartInicial);

  // ── Carga ──────────────────────────────────────────────────
  const filtrosBase = {
    semana: filtroSemana || undefined,
    sedeId: filtroSedeId || undefined,
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      if      (tab === "ingresos") setIngresos(await contabilidadService.obtenerIngresos(filtrosBase));
      else if (tab === "egresos")  setEgresos(await contabilidadService.obtenerEgresos(filtrosBase));
      else if (tab === "cartera")  setCartera(await contabilidadService.obtenerCartera(filtrosBase));
      else if (tab === "arqueo")   setArqueo(await contabilidadService.obtenerArqueo(parseInt(filtroSemana) || SEM_ACTUAL));
    } catch (err) {
      toast.error("Error al cargar datos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [tab, filtroSemana, filtroSedeId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Total calculado en tiempo real ─────────────────────────
  const totalIngreso = (parseFloat(formIng.efectivo) || 0) +
                       (parseFloat(formIng.cuentas)  || 0);

  // ── Resúmenes por sede ─────────────────────────────────────
  const mapSede = (items) => items.map((i) => ({
    ...i,
    sede: SEDES.find((s) => s.id === i.sedeId)?.nombre ?? `Sede ${i.sedeId}`,
  }));

  const resumenPorSede = (items, campo) => SEDES.map((s) => ({
    sede:  s.nombre,
    valor: items.filter((i) => i.sedeId === s.id)
                .reduce((sum, i) => sum + (parseFloat(i[campo]) || 0), 0),
  }));

  const totalDeSede = (items, campo) =>
    items.reduce((sum, i) => sum + (parseFloat(i[campo]) || 0), 0);

  // ── Handlers ───────────────────────────────────────────────
  const hIng  = (e) => setFormIng((p)  => ({ ...p, [e.target.name]: e.target.value }));
  const hEgr  = (e) => setFormEgr((p)  => ({ ...p, [e.target.name]: e.target.value }));
  const hCart = (e) => setFormCart((p) => ({ ...p, [e.target.name]: e.target.value }));

  // ── Guardar ingreso ─────────────────────────────────────────
  const handleGuardarIngreso = async () => {
    setGuardando(true);
    try {
      if (itemEditar) {
        await contabilidadService.editarIngreso(itemEditar.id, {
          efectivo: parseFloat(formIng.efectivo) || 0,
          cuentas:  parseFloat(formIng.cuentas)  || 0,
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
    } catch (err) { toast.error(err.message); }
    finally      { setGuardando(false); }
  };

  // ── Guardar egreso ──────────────────────────────────────────
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
    } catch (err) { toast.error(err.message); }
    finally      { setGuardando(false); }
  };

  // ── Guardar cartera ─────────────────────────────────────────
  const handleGuardarCartera = async () => {
    setGuardando(true);
    try {
      await contabilidadService.registrarCartera(formCart);
      toast.success("Cartera registrada.");
      setModalCartAbierto(false);
      await cargarDatos();
    } catch (err) { toast.error(err.message); }
    finally      { setGuardando(false); }
  };

  // ── Eliminar ────────────────────────────────────────────────
  const handleEliminar = async () => {
    setGuardando(true);
    try {
      if (tipoEliminar === "ingreso") await contabilidadService.eliminarIngreso(itemEliminar.id);
      else                            await contabilidadService.eliminarEgreso(itemEliminar.id);
      toast.success("Registro eliminado.");
      setModalConfirmAbierto(false);
      await cargarDatos();
    } catch (err) { toast.error(err.message); }
    finally      { setGuardando(false); }
  };

  // ── Abrir modales ───────────────────────────────────────────
  const abrirNuevo = () => {
    setItemEditar(null);
    if (tab === "ingresos") { setFormIng(formIngInicial);   setModalIngAbierto(true);  }
    if (tab === "egresos")  { setFormEgr(formEgrInicial);   setModalEgrAbierto(true);  }
    if (tab === "cartera")  { setFormCart(formCartInicial); setModalCartAbierto(true); }
  };

  const abrirEditar = (item, tipo) => {
    setItemEditar(item);
    if (tipo === "ingreso") {
      setFormIng({ fecha: item.fecha?.split("T")[0] ?? HOY, sedeId: String(item.sedeId),
        efectivo: String(item.efectivo ?? ""), cuentas: String(item.cuentas ?? ""),
        observacion: item.observacion ?? "" });
      setModalIngAbierto(true);
    } else {
      setFormEgr({ fecha: item.fecha?.split("T")[0] ?? HOY, sedeId: String(item.sedeId),
        concepto: item.concepto ?? "", total: String(item.total ?? ""),
        observaciones: item.observaciones ?? "" });
      setModalEgrAbierto(true);
    }
  };

  const abrirEliminar = (item, tipo) => {
    setItemEliminar(item); setTipoEliminar(tipo); setModalConfirmAbierto(true);
  };

  // ── Columnas ────────────────────────────────────────────────
  const colsIngresos = [
    { campo: "fecha",      label: "Fecha",    tipo: "fecha"  },
    { campo: "semana",     label: "Sem.",      tipo: "texto"  },
    { campo: "sede",       label: "Sede",      tipo: "texto"  },
    { campo: "efectivo",   label: "Efectivo",  tipo: "moneda" },
    { campo: "cuentas",    label: "Cuentas",   tipo: "moneda" },
    { campo: "total",      label: "Total",     tipo: "moneda" },
    { campo: "observacion",label: "Obs.",      tipo: "texto"  },
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

  const accsIngresos = esAdmin ? (row) => [
    { label: "Editar",   icon: "edit",   onClick: () => abrirEditar(row, "ingreso") },
    { label: "Eliminar", icon: "delete", variante: "danger", onClick: () => abrirEliminar(row, "ingreso") },
  ] : undefined;

  const accsEgresos = esAdmin ? (row) => [
    { label: "Editar",   icon: "edit",   onClick: () => abrirEditar(row, "egreso") },
    { label: "Eliminar", icon: "delete", variante: "danger", onClick: () => abrirEliminar(row, "egreso") },
  ] : undefined;

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="cont-page">
      {/* Header */}
      <div className="cont-page__header">
        <div>
          <h1>Contabilidad</h1>
          <p className="cont-subtitulo">Semana {filtroSemana}</p>
        </div>
        <div className="cont-page__acciones">
          {esAdmin && (
            <div className="filter-group">
              <label htmlFor="cont-sede">Sede</label>
              <select id="cont-sede" value={filtroSedeId}
                onChange={(e) => setFiltroSedeId(e.target.value)} className="filter-select">
                <option value="">Todas</option>
                {SEDES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="filter-group">
            <label htmlFor="cont-semana">Semana</label>
            <input id="cont-semana" type="number" min="1" max="53"
              value={filtroSemana} onChange={(e) => setFiltroSemana(e.target.value)}
              className="filter-select" style={{ minWidth: 72 }} />
          </div>
          {puedeRegistrar && tab !== "arqueo" && (
            <button className="btn-cta" type="button" onClick={abrirNuevo}>
              <span className="material-symbols-outlined">add</span>
              {tab === "ingresos" ? "Nuevo ingreso"
                : tab === "egresos" ? "Nuevo egreso"
                : "Registrar cartera"}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="cont-tabs">
        {TABS.map((t) => (
          <button key={t.key} type="button"
            className={`cont-tab-btn ${tab === t.key ? "cont-tab-btn--active" : ""}`}
            onClick={() => setTab(t.key)}>
            <span className="material-symbols-outlined">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {cargando ? <Spinner /> : (
        <div className="cont-tab-body">

          {/* ── INGRESOS ── */}
          {tab === "ingresos" && (
            <>
              {ingresos.length > 0 && (
                <div className="cont-resumen-row">
                  <TarjetaResumen titulo="Efectivo" icono="payments"
                    color="var(--aged-gold)"
                    filas={resumenPorSede(ingresos, "efectivo")}
                    total={totalDeSede(ingresos, "efectivo")} />
                  <TarjetaResumen titulo="Cuentas / Transferencias" icono="account_balance"
                    color="var(--secondary)"
                    filas={resumenPorSede(ingresos, "cuentas")}
                    total={totalDeSede(ingresos, "cuentas")} />
                  <TarjetaResumen titulo="Total Ingresos" icono="trending_up"
                    color="#4ade80"
                    filas={resumenPorSede(ingresos, "total")}
                    total={totalDeSede(ingresos, "total")} />
                </div>
              )}
              <div className="cont-tabla-wrap">
                <TablaGenerica columnas={colsIngresos} datos={mapSede(ingresos)}
                  filasPorPagina={10} mostrarBuscador
                  buscarEnCampos={["sede", "observacion"]} paginacion
                  renderAcciones={accsIngresos} />
              </div>
            </>
          )}

          {/* ── EGRESOS ── */}
          {tab === "egresos" && (
            <>
              {egresos.length > 0 && (
                <div className="cont-resumen-row">
                  <TarjetaResumen titulo="Total Egresos" icono="trending_down"
                    color="var(--error)"
                    filas={resumenPorSede(egresos, "total")}
                    total={totalDeSede(egresos, "total")} />
                </div>
              )}
              <div className="cont-tabla-wrap">
                <TablaGenerica columnas={colsEgresos} datos={mapSede(egresos)}
                  filasPorPagina={10} mostrarBuscador
                  buscarEnCampos={["sede", "concepto", "observaciones"]} paginacion
                  renderAcciones={accsEgresos} />
              </div>
            </>
          )}

          {/* ── CARTERA ── */}
          {tab === "cartera" && (
            <>
              {cartera.length > 0 && (
                <div className="cont-resumen-row">
                  <TarjetaResumen titulo="Cartera Actual por Sede" icono="account_balance"
                    color="var(--primary)"
                    filas={SEDES.map((s) => {
                      const reg = [...cartera].filter((c) => c.sedeId === s.id)
                        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
                      return { sede: s.nombre, valor: reg?.saldoDia ?? 0 };
                    })}
                    total={cartera.reduce((s, c) => s + (parseFloat(c.saldoDia) || 0), 0)} />
                </div>
              )}
              <div className="cont-tabla-wrap">
                <TablaGenerica columnas={colsCartera} datos={mapSede(cartera)}
                  filasPorPagina={10} mostrarBuscador
                  buscarEnCampos={["sede"]} paginacion />
              </div>
            </>
          )}

          {/* ── ARQUEO ── */}
          {tab === "arqueo" && (
            !arqueo ? (
              <div className="cont-empty">
                <span className="material-symbols-outlined">summarize</span>
                <p>No hay datos de arqueo para la semana {filtroSemana}.</p>
                <span className="cont-empty__hint">
                  El arqueo estará disponible cuando el backend implemente{" "}
                  <code>GET /contabilidad/arqueo</code>
                </span>
              </div>
            ) : (
              <div className="cont-arqueo">
                <div className="cont-arqueo-header">
                  <h2>Arqueo Semana {arqueo.semana ?? filtroSemana}</h2>
                  {arqueo.fechaInicio && (
                    <span className="cont-arqueo-rango">
                      {formatFecha(arqueo.fechaInicio)} → {formatFecha(arqueo.fechaFin)}
                    </span>
                  )}
                </div>
                <ArqueoBloque numero={1} titulo="Ingresos de la Semana"
                  columnas={["Sede", "Efectivo", "Cuentas", "Total"]}
                  filas={(arqueo.ingresos ?? []).map((r) => [r.sede, formatCOP(r.efectivo), formatCOP(r.cuentas), formatCOP(r.total)])}
                  totalFila={["TOTAL",
                    formatCOP(arqueo.ingresos?.reduce((s, r) => s + (r.efectivo ?? 0), 0)),
                    formatCOP(arqueo.ingresos?.reduce((s, r) => s + (r.cuentas   ?? 0), 0)),
                    formatCOP(arqueo.ingresos?.reduce((s, r) => s + (r.total     ?? 0), 0))]} />
                <ArqueoBloque numero={2} titulo="Egresos de la Semana"
                  columnas={["Sede", "Egresos", "Proveedores", "Total"]}
                  filas={(arqueo.egresos ?? []).map((r) => [r.sede, formatCOP(r.egresos), formatCOP(r.proveedores), formatCOP((r.egresos ?? 0) + (r.proveedores ?? 0))])}
                  totalFila={["TOTAL",
                    formatCOP(arqueo.egresos?.reduce((s, r) => s + (r.egresos     ?? 0), 0)),
                    formatCOP(arqueo.egresos?.reduce((s, r) => s + (r.proveedores ?? 0), 0)),
                    formatCOP(arqueo.egresos?.reduce((s, r) => s + (r.egresos ?? 0) + (r.proveedores ?? 0), 0))]} />
                <ArqueoBloque numero={3} titulo="Saldo Neto"
                  columnas={["Sede", "Ingresos", "Egresos", "Saldo Neto"]}
                  filas={(arqueo.saldoNeto ?? []).map((r) => [r.sede, formatCOP(r.ingresos), formatCOP(r.egresos), formatCOP(r.saldoNeto)])}
                  totalFila={["TOTAL",
                    formatCOP(arqueo.saldoNeto?.reduce((s, r) => s + (r.ingresos  ?? 0), 0)),
                    formatCOP(arqueo.saldoNeto?.reduce((s, r) => s + (r.egresos   ?? 0), 0)),
                    formatCOP(arqueo.saldoNeto?.reduce((s, r) => s + (r.saldoNeto ?? 0), 0))]} />
                <ArqueoBloque numero={4} titulo="Proveedores de la Semana"
                  columnas={["Concepto", "Valor"]}
                  filas={[
                    ["Deuda registrada",   formatCOP(arqueo.proveedores?.deuda)],
                    ["Pagado",             formatCOP(arqueo.proveedores?.pagado)],
                    ["Saldo pendiente",    formatCOP(arqueo.proveedores?.pendiente)],
                  ]} />
                <ArqueoBloque numero={5} titulo="Variación de Cartera"
                  columnas={["Sede", "Saldo Inicio", "Saldo Cierre"]}
                  filas={(arqueo.cartera ?? []).map((r) => [r.sede, formatCOP(r.saldoInicio), formatCOP(r.saldoCierre)])}
                  totalFila={["TOTAL",
                    formatCOP(arqueo.cartera?.reduce((s, r) => s + (r.saldoInicio ?? 0), 0)),
                    formatCOP(arqueo.cartera?.reduce((s, r) => s + (r.saldoCierre ?? 0), 0))]} />
                <ArqueoBloque numero={6} titulo="Variación de Inventario"
                  columnas={["Sede", "Cant. Cierre", "Costo Cierre"]}
                  filas={(arqueo.inventario ?? []).map((r) => [r.sede,
                    new Intl.NumberFormat("es-CO").format(r.cantCierre ?? 0),
                    formatCOP(r.costoCierre)])}
                  totalFila={["TOTAL",
                    new Intl.NumberFormat("es-CO").format(arqueo.inventario?.reduce((s, r) => s + (r.cantCierre ?? 0), 0)),
                    formatCOP(arqueo.inventario?.reduce((s, r) => s + (r.costoCierre ?? 0), 0))]} />
              </div>
            )
          )}

        </div>
      )}

      {/* ── MODAL INGRESO ── */}
      <Modal isOpen={modalIngAbierto}
        onClose={() => { setModalIngAbierto(false); setItemEditar(null); }}
        titulo={itemEditar ? "Editar Ingreso" : "Registrar Ingreso"}
        textoBotonConfirmar={guardando ? "Guardando..." : "Guardar"}
        onConfirmar={handleGuardarIngreso} mostrarCancelar>
        <div className="cont-modal-form">
          {!itemEditar && (
            <>
              <div className="cont-form-group">
                <label>Fecha *</label>
                <input type="date" name="fecha" value={formIng.fecha}
                  onChange={hIng} className="cont-input" max={HOY} />
              </div>
              {esAdmin && (
                <div className="cont-form-group">
                  <label>Sede *</label>
                  <select name="sedeId" value={formIng.sedeId}
                    onChange={hIng} className="cont-input cont-select">
                    <option value="">— Selecciona —</option>
                    {SEDES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
          <div className="cont-form-group">
            <label>Efectivo (COP)</label>
            <input type="number" name="efectivo" value={formIng.efectivo}
              onChange={hIng} className="cont-input" min="0" step="1000" placeholder="0" />
          </div>
          <div className="cont-form-group">
            <label>Cuentas / Transferencias (COP)</label>
            <input type="number" name="cuentas" value={formIng.cuentas}
              onChange={hIng} className="cont-input" min="0" step="1000" placeholder="0" />
          </div>
          <div className="cont-total-display">
            <span>Total calculado</span>
            <span className="cont-total-valor">{formatCOP(totalIngreso)}</span>
          </div>
          <div className="cont-form-group">
            <label>Observaciones</label>
            <input type="text" name="observacion" value={formIng.observacion}
              onChange={hIng} className="cont-input"
              placeholder="Ej: Ingreso dominical, cobro cartera..." />
          </div>
        </div>
      </Modal>

      {/* ── MODAL EGRESO ── */}
      <Modal isOpen={modalEgrAbierto}
        onClose={() => { setModalEgrAbierto(false); setItemEditar(null); }}
        titulo={itemEditar ? "Editar Egreso" : "Registrar Egreso"}
        textoBotonConfirmar={guardando ? "Guardando..." : "Guardar"}
        onConfirmar={handleGuardarEgreso} mostrarCancelar>
        <div className="cont-modal-form">
          {!itemEditar && (
            <>
              <div className="cont-form-group">
                <label>Fecha *</label>
                <input type="date" name="fecha" value={formEgr.fecha}
                  onChange={hEgr} className="cont-input" max={HOY} />
              </div>
              {esAdmin && (
                <div className="cont-form-group">
                  <label>Sede *</label>
                  <select name="sedeId" value={formEgr.sedeId}
                    onChange={hEgr} className="cont-input cont-select">
                    <option value="">— Selecciona —</option>
                    {SEDES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
          <div className="cont-form-group">
            <label>Concepto *</label>
            <input type="text" name="concepto" value={formEgr.concepto}
              onChange={hEgr} className="cont-input"
              placeholder="Gastos, Salarios, Arriendo..." />
          </div>
          <div className="cont-form-group">
            <label>Total (COP) *</label>
            <input type="number" name="total" value={formEgr.total}
              onChange={hEgr} className="cont-input" min="0" step="1000" placeholder="0" />
            {formEgr.total && (
              <span className="cont-input-hint">{formatCOP(formEgr.total)}</span>
            )}
          </div>
          <div className="cont-form-group">
            <label>Observaciones</label>
            <textarea name="observaciones" value={formEgr.observaciones}
              onChange={hEgr} className="cont-input cont-textarea" rows={3}
              placeholder="Ej: SUELDO POLLO Y PAGO NUÑEZ, ARRIENDO..." />
          </div>
        </div>
      </Modal>

      {/* ── MODAL CARTERA ── */}
      <Modal isOpen={modalCartAbierto}
        onClose={() => setModalCartAbierto(false)}
        titulo="Registrar Saldo de Cartera"
        textoBotonConfirmar={guardando ? "Guardando..." : "Guardar"}
        onConfirmar={handleGuardarCartera} mostrarCancelar>
        <div className="cont-modal-form">
          <div className="cont-form-group">
            <label>Fecha *</label>
            <input type="date" name="fecha" value={formCart.fecha}
              onChange={hCart} className="cont-input" max={HOY} />
          </div>
          {esAdmin && (
            <div className="cont-form-group">
              <label>Sede *</label>
              <select name="sedeId" value={formCart.sedeId}
                onChange={hCart} className="cont-input cont-select">
                <option value="">— Selecciona —</option>
                {SEDES.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
          )}
          <div className="cont-form-group">
            <label>Saldo del Día (COP) *</label>
            <input type="number" name="saldoDia" value={formCart.saldoDia}
              onChange={hCart} className="cont-input" min="0" step="1000" placeholder="0" />
            {formCart.saldoDia && (
              <span className="cont-input-hint">{formatCOP(formCart.saldoDia)}</span>
            )}
          </div>
          <div className="cont-nota-info">
            <span className="material-symbols-outlined">info</span>
            <p>Ingresa solo el saldo del día. La variación respecto al día anterior
               se calcula automáticamente en el backend.</p>
          </div>
        </div>
      </Modal>

      {/* ── MODAL CONFIRMAR ELIMINAR ── */}
      <Modal isOpen={modalConfirmAbierto}
        onClose={() => setModalConfirmAbierto(false)}
        titulo="Eliminar registro"
        textoBotonConfirmar={guardando ? "Eliminando..." : "Sí, eliminar"}
        onConfirmar={handleEliminar} mostrarCancelar>
        <div className="cont-confirm-body">
          <span className="material-symbols-outlined">warning</span>
          <p>¿Eliminar este registro? Esta acción no se puede deshacer.</p>
        </div>
      </Modal>
    </div>
  );
};

export default ContabilidadPage;
