import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import TarjetaKpi from "./TarjetaKpi";
import { formatCOP, formatFecha, getRangoSemana, getSemanaISO } from "@/utils/formatters";

const toNumber = (v) => Number(v ?? 0);

const PanelGeneralTab = ({ panelGeneral, fecha, semanaNumero }) => {
  const rangoSemana = useMemo(() => getRangoSemana(semanaNumero), [semanaNumero]);

  const panelSedes = useMemo(() => {
    if (!panelGeneral) return [];
    return (panelGeneral._sedes ?? []).map((s) => {
      const ing    = (panelGeneral.ingresos?.porSede ?? []).find((r) => r.sedeId === s.id);
      const egr    = (panelGeneral.egresos?.porSede  ?? []).find((r) => r.sedeId === s.id);
      const ingV   = toNumber(ing?.total);
      const egrV   = toNumber(egr?.total);
      return {
        sede: s.nombre, sedeId: s.id,
        efectivo: toNumber(ing?.efectivo), cuentas: toNumber(ing?.cuentas),
        ingresos: ingV, egresos: egrV, saldoNeto: ingV - egrV,
      };
    });
  }, [panelGeneral]);

  const chartSedes = useMemo(() =>
    panelSedes.map((s) => ({ sede: s.sede, Ingresos: s.ingresos, Egresos: s.egresos, "Saldo Neto": s.saldoNeto })),
  [panelSedes]);

  const saldoNeto = toNumber(panelGeneral?.ingresos?.total) - toNumber(panelGeneral?.egresos?.total);

  return (
    <div className="panel-general">
      <div className="panel-kpis">
        <TarjetaKpi
          titulo="Ingresos del dia"
          icono="trending_up"
          color="#4ade80"
          valor={formatCOP(panelGeneral.ingresos?.total)}
          subtitulo={`${formatFecha(fecha)} · ${formatFecha(rangoSemana.inicio)} al ${formatFecha(rangoSemana.fin)}`}
        />
        <TarjetaKpi
          titulo="Egresos del dia"
          icono="trending_down"
          color="var(--error)"
          valor={formatCOP(panelGeneral.egresos?.total)}
          subtitulo="Operativos registrados"
        />
        <TarjetaKpi
          titulo="Saldo neto"
          icono="account_balance_wallet"
          color={saldoNeto >= 0 ? "#4ade80" : "var(--error)"}
          valor={formatCOP(saldoNeto)}
          subtitulo="Ingresos - egresos"
        />
        <TarjetaKpi
          titulo="Cartera actual"
          icono="payments"
          color="var(--primary)"
          valor={formatCOP(panelGeneral.cartera)}
          subtitulo="Saldo pendiente de clientes"
        />
        <TarjetaKpi
          titulo="Stock unidades"
          icono="inventory_2"
          color="var(--aged-gold)"
          valor={new Intl.NumberFormat("es-CO").format(panelGeneral.totalStockUnidades)}
          subtitulo="Total acumulado por sedes"
        />
      </div>

      <div className="panel-charts">
        <section className="panel-section">
          <h3 className="panel-section__title">
            <span className="material-symbols-outlined">bar_chart</span>
            Resultado por sede
          </h3>
          <div className="panel-chart-wrap" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartSedes} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                <XAxis dataKey="sede" />
                <YAxis />
                <Tooltip formatter={(value) => formatCOP(value)} />
                <Legend />
                <Bar dataKey="Ingresos"   fill="var(--secondary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Egresos"    fill="var(--error)"     radius={[6, 6, 0, 0]} />
                <Bar dataKey="Saldo Neto" fill="#4ade80"          radius={[6, 6, 0, 0]} />
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
                <div className="panel-sede-card__row"><span>Efectivo</span>  <strong>{formatCOP(s.efectivo)}</strong></div>
                <div className="panel-sede-card__row"><span>Cuentas</span>   <strong>{formatCOP(s.cuentas)}</strong></div>
                <div className="panel-sede-card__row"><span>Ingresos</span>  <strong className="panel-green">{formatCOP(s.ingresos)}</strong></div>
                <div className="panel-sede-card__row"><span>Egresos</span>   <strong className="panel-red">{formatCOP(s.egresos)}</strong></div>
                <div className="panel-sede-card__row"><span>Saldo neto</span><strong className={s.saldoNeto >= 0 ? "panel-green" : "panel-red"}>{formatCOP(s.saldoNeto)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PanelGeneralTab;
