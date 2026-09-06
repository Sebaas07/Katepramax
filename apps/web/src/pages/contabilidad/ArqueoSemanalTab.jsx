import { useMemo } from "react";
import ArqueoBloque from "./ArqueoBloque";
import { EmptyState } from "./ContabilidadUI";
import { formatCOP, formatFecha, getRangoSemana } from "@/utils/formatters";

const toNumber = (v) => Number(v ?? 0);
const sumar    = (filas, campo) => filas.reduce((t, f) => t + toNumber(f?.[campo]), 0);
const rowsDeReporte = (data) => (Array.isArray(data) ? data : data?.porSede ?? []);

const ArqueoSemanalTab = ({ arqueo, arqueoError, filtroSemana, onFiltroSemanaChange, sedes, mostrarFiltro = true }) => {
  const semanaNum  = parseInt(filtroSemana, 10) || 1;
  const rangoSemana = useMemo(() => getRangoSemana(semanaNum), [semanaNum]);

  // El arqueo semanal agrupa por todas las sedes (oficinas y bodegas); el
  // fallback de soporte debe mostrar las mismas sedes que el reporte.
  const sedesOficinas = useMemo(() => sedes ?? [], [sedes]);

  // ── Cálculos derivados del arqueo ───────────────────────────
  const arqueoIngresos = useMemo(() =>
    rowsDeReporte(arqueo?.ingresos).map((r) => ({
      sede: r.sede, sedeId: r.sedeId,
      efectivo: toNumber(r.efectivo), transferencia: toNumber(r.transferencia ?? r.cuentas), abonos: toNumber(r.abonos), total: toNumber(r.total),
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
      return { sede: ing.sede, sedeId: ing.sedeId, ingresos: toNumber(ing.total), egresos: toNumber(egr?.totalEgresos ?? 0), saldoNeto: toNumber(ing.total) - toNumber(egr?.totalEgresos ?? 0) };
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
    if (!regs.length) return sedesOficinas.map((s) => ({ sede: s.nombre, sedeId: s.id, saldoInicio: 0, saldoCierre: 0, variacion: 0 }));
    return sedesOficinas.map((s) => {
      const rows   = regs.filter((c) => c.sedeId === s.id);
      const ini    = toNumber(rows[0]?.saldoAnterior ?? rows[0]?.saldoDia);
      const cierre = toNumber(rows[rows.length - 1]?.saldoDia);
      return { sede: s.nombre, sedeId: s.id, saldoInicio: ini, saldoCierre: cierre, variacion: cierre - ini };
    });
  }, [arqueo, sedesOficinas]);

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
    if (!regs.length) return sedesOficinas.map((s) => ({ sede: s.nombre, sedeId: s.id, cantCierre: 0, costoCierre: 0 }));
    return sedesOficinas.map((s) => {
      const filas = regs.filter((i) => i.sedeId === s.id);
      return {
        sede: s.nombre, sedeId: s.id,
        cantCierre:  filas.reduce((t, i) => t + toNumber(i.cantidad ?? i.cantidadIngresada), 0),
        costoCierre: filas.reduce((t, i) => t + toNumber(i.costo), 0),
      };
    });
  }, [arqueo, sedesOficinas]);

  const totales = useMemo(() => ({
    ingresos: {
      efectivo:      arqueo?.ingresos?.totales?.efectivo      ?? sumar(arqueoIngresos, "efectivo"),
      transferencia: arqueo?.ingresos?.totales?.transferencia ?? sumar(arqueoIngresos, "transferencia"),
      abonos:        arqueo?.ingresos?.totales?.abonos        ?? sumar(arqueoIngresos, "abonos"),
      total:         arqueo?.ingresos?.totales?.total         ?? sumar(arqueoIngresos, "total"),
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

  if (!arqueo) {
    if (mostrarFiltro === false) return null;
    return (
      <EmptyState
        icono="summarize"
        titulo={arqueoError || `No hay datos de arqueo para la semana ${filtroSemana}.`}
        detalle="Valida que existan registros de ingresos, egresos, abonos, cartera o inventario en este rango."
      />
    );
  }

  return (
    <div className="cont-arqueo">
      {/* Filtro de semana */}
      {mostrarFiltro && (
        <div className="arqueo-filtro-card">
        <div className="filter-group">
          <label htmlFor="arqueo-semana">Numero de semana</label>
          <input
            id="arqueo-semana"
            type="number" min="1" max="53"
            value={filtroSemana}
            onChange={(e) => onFiltroSemanaChange(e.target.value)}
            className="filter-select"
            style={{ minWidth: 72 }}
          />
        </div>
        <div className="arqueo-rango-box">
          <span className="material-symbols-outlined">calendar_month</span>
          <div>
            <strong>Rango de fechas</strong>
            <span>{formatFecha(rangoSemana.inicio)} → {formatFecha(rangoSemana.fin)}</span>
          </div>
        </div>
      </div>
      )}

      {/* KPIs */}
      <div className="arqueo-kpis">
        {[
          { accent: "#4ade80",       icon: "trending_up",           titulo: "Ingresos Semanales", valor: totales.ingresos.total, sub: `${formatCOP(totales.ingresos.efectivo)} efectivo · ${formatCOP(totales.ingresos.transferencia)} transferencia` },
          { accent: "var(--error)",  icon: "trending_down",         titulo: "Egresos Semanales",  valor: totales.egresos.total, sub: `${formatCOP(totales.egresos.operativo)} operativos · ${formatCOP(totales.egresos.proveedores)} proveedores` },
          { accent: totales.saldoNeto >= 0 ? "#4ade80" : "var(--error)", icon: "account_balance_wallet", titulo: "Saldo Neto",  valor: totales.saldoNeto, sub: "Ingresos - egresos" },
          { accent: "var(--primary)",icon: "payments",              titulo: "Cartera",            valor: totales.cartera,    sub: "Saldo pendiente de clientes" },
          { accent: "var(--aged-gold)", icon: "inventory_2",        titulo: "Inventario",         valor: totales.inventario, sub: "Costo de inventario ingresado" },
        ].map(({ accent, icon, titulo, valor, sub }) => (
          <div key={titulo} className="arqueo-card" style={{ "--card-accent": accent }}>
            <div className="arqueo-card__header">
              <span className="material-symbols-outlined">{icon}</span>
              <h4>{titulo}</h4>
            </div>
            <div className="arqueo-card__sede">General</div>
            <strong>{formatCOP(valor)}</strong>
            <span className="arqueo-card__sub">{sub}</span>
          </div>
        ))}
      </div>

      {/* Bloques de tabla */}
      <ArqueoBloque numero={1} titulo="Ingresos Semanales"
        columnas={["Sede", "Efectivo", "Transferencia", "Abonos", "Total"]}
        filas={arqueoIngresos.map((r) => [r.sede, formatCOP(r.efectivo), formatCOP(r.transferencia), formatCOP(r.abonos), formatCOP(r.total)])}
        totalFila={["TOTAL GENERAL", formatCOP(totales.ingresos.efectivo), formatCOP(totales.ingresos.transferencia), formatCOP(totales.ingresos.abonos), formatCOP(totales.ingresos.total)]} />

      <ArqueoBloque numero={2} titulo="Egresos Semanales"
        columnas={["Sede", "Operativos", "Proveedores", "Total Egresos"]}
        filas={arqueoEgresos.map((r) => [r.sede, formatCOP(r.operativo), formatCOP(r.proveedores), formatCOP(r.totalEgresos)])}
        totalFila={["TOTAL GENERAL", formatCOP(totales.egresos.operativo), formatCOP(totales.egresos.proveedores), formatCOP(totales.egresos.total)]} />

      <ArqueoBloque numero={3} titulo="Saldo Neto"
        columnas={["Sede", "Ingresos", "Egresos", "Saldo Neto"]}
        filas={arqueoSaldoNeto.map((r) => [r.sede, formatCOP(r.ingresos), formatCOP(r.egresos), formatCOP(r.saldoNeto)])}
        totalFila={["TOTAL GENERAL", formatCOP(totales.ingresos.total), formatCOP(totales.egresos.total), formatCOP(totales.saldoNeto)]} />

      <ArqueoBloque numero={4} titulo="Variacion de Cartera"
        columnas={["Sede", "Saldo Inicio", "Saldo Cierre", "Variacion"]}
        filas={arqueoCartera.map((r) => [r.sede, formatCOP(r.saldoInicio), formatCOP(r.saldoCierre), formatCOP(r.variacion)])}
        totalFila={["TOTAL GENERAL", formatCOP(sumar(arqueoCartera, "saldoInicio")), formatCOP(sumar(arqueoCartera, "saldoCierre")), formatCOP(sumar(arqueoCartera, "variacion"))]} />

      <ArqueoBloque numero={5} titulo="Variacion de Inventario"
        columnas={["Sede", "Cantidad Semana", "Costo Semana"]}
        filas={arqueoInventario.map((r) => [r.sede, new Intl.NumberFormat("es-CO").format(r.cantCierre), formatCOP(r.costoCierre)])}
        totalFila={["TOTAL GENERAL", new Intl.NumberFormat("es-CO").format(sumar(arqueoInventario, "cantCierre")), formatCOP(totales.inventario)]} />
    </div>
  );
};

export default ArqueoSemanalTab;
