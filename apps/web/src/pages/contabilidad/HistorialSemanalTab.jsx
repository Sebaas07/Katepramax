import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import ArqueoBloque from "./ArqueoBloque";
import { EmptyState } from "./ContabilidadUI";
import ChartTooltip from "@/components/common/ChartTooltip/ChartTooltip";
import { formatCOP } from "@/utils/formatters";

const toNumber = (v) => Number(v ?? 0);

const TICK_TEMA = { fill: "var(--on-surface-variant)", fontSize: 12 };
const AXIS_TEMA = { stroke: "var(--outline-variant)" };

// Backend: GET /reportes/historial-semanal → { total, skip, take, data: [{ semana, ingTotal, egrTotal, saldoNeto, ingEfectivo, ingCuentas, deudaProveedores, costoInventario }] }
const HistorialSemanalTab = ({ historial }) => {
  // El backend entrega las semanas en orden descendente; para la gráfica
  // de tendencia necesitamos orden ascendente (semana más antigua primero).
  const historialAsc = useMemo(
    () => (historial ?? []).slice().sort((a, b) => a.semana - b.semana),
    [historial],
  );

  const chartData = useMemo(
    () =>
      historialAsc.map((h) => ({
        semana: `Sem. ${h.semana}`,
        Ingresos: toNumber(h.ingTotal),
        Egresos: toNumber(h.egrTotal),
        "Saldo Neto": toNumber(h.saldoNeto),
      })),
    [historialAsc],
  );

  const chartDeudaInventario = useMemo(
    () =>
      historialAsc.map((h) => ({
        semana: `Sem. ${h.semana}`,
        "Deuda Proveedores": toNumber(h.deudaProveedores),
        "Costo Inventario": toNumber(h.costoInventario),
      })),
    [historialAsc],
  );

  const filasTabla = useMemo(
    () =>
      (historial ?? []).map((h) => [
        `Semana ${h.semana}`,
        formatCOP(h.ingTotal),
        formatCOP(h.egrTotal),
        formatCOP(h.saldoNeto),
        formatCOP(h.deudaProveedores),
        formatCOP(h.costoInventario),
      ]),
    [historial],
  );

  if (!historial || historial.length === 0) {
    return (
      <EmptyState
        icono="timeline"
        titulo="Aun no hay historial semanal disponible."
        detalle="A medida que registres ingresos, egresos, abonos e inventario semana a semana, aqui apareceran las tendencias."
      />
    );
  }

  return (
    <div className="cont-historial">
      <div className="panel-charts">
        <section className="panel-section">
          <h3 className="panel-section__title">
            <span className="material-symbols-outlined">timeline</span>
            Tendencia semanal — ingresos, egresos y saldo neto
          </h3>
          <div className="panel-chart-wrap" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
              >
                <XAxis dataKey="semana" tick={TICK_TEMA} axisLine={AXIS_TEMA} tickLine={false} />
                <YAxis tick={TICK_TEMA} axisLine={AXIS_TEMA} tickLine={false} />
                <Tooltip content={<ChartTooltip formato={formatCOP} />} />
                <Legend wrapperStyle={{ color: "var(--on-surface-variant)", fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="Ingresos"
                  stroke="var(--secondary)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="Egresos"
                  stroke="var(--error)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="Saldo Neto"
                  stroke="#4ade80"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel-section">
          <h3 className="panel-section__title">
            <span className="material-symbols-outlined">inventory_2</span>
            Deuda a proveedores vs. costo de inventario
          </h3>
          <div className="panel-chart-wrap" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartDeudaInventario}
                margin={{ top: 16, right: 24, left: 0, bottom: 8 }}
              >
                <XAxis dataKey="semana" tick={TICK_TEMA} axisLine={AXIS_TEMA} tickLine={false} />
                <YAxis tick={TICK_TEMA} axisLine={AXIS_TEMA} tickLine={false} />
                <Tooltip content={<ChartTooltip formato={formatCOP} />} />
                <Legend wrapperStyle={{ color: "var(--on-surface-variant)", fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="Deuda Proveedores"
                  stroke="#ddb7ff"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="Costo Inventario"
                  stroke="var(--aged-gold)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <ArqueoBloque
        numero={1}
        titulo="Historial semanal acumulado"
        columnas={[
          "Semana",
          "Ingresos",
          "Egresos",
          "Saldo Neto",
          "Deuda Proveedores",
          "Costo Inventario",
        ]}
        filas={filasTabla}
      />
    </div>
  );
};

export default HistorialSemanalTab;
