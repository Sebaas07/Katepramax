import { useMemo } from "react";
import ArqueoBloque from "./ArqueoBloque";
import { EmptyState } from "./ContabilidadUI";
import { formatCOP, formatFecha, getRangoSemana } from "@/utils/formatters";

const toNumber = (v) => Number(v ?? 0);
const sumar    = (filas, campo) => filas.reduce((t, f) => t + toNumber(f?.[campo]), 0);
const rowsDeReporte = (data) => (Array.isArray(data) ? data : data?.porSede ?? []);

const ArqueoSemanalTab = ({ arqueo, arqueoError, filtroSemana, onFiltroSemanaChange, mostrarFiltro = true }) => {
  const semanaNum  = parseInt(filtroSemana, 10) || 1;
  const rangoSemana = useMemo(() => getRangoSemana(semanaNum), [semanaNum]);

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
    inventario: toNumber(arqueo?.costoInventario),
  }), [arqueo, arqueoIngresos, arqueoEgresos, arqueoSaldoNeto]);

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
    </div>
  );
};

export default ArqueoSemanalTab;
