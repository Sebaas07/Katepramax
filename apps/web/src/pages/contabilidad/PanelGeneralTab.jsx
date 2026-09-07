import { useMemo } from "react";
import TarjetaKpi from "./TarjetaKpi";
import { formatCOP, formatFecha } from "@/utils/formatters";

const toNumber = (v) => Number(v ?? 0);

// Backend: GET /reportes/panel-general → { fecha, ingresos: { total, efectivo, cuentas, porSede }, egresos: { total, porSede }, cartera, totalStockUnidades }
const PanelGeneralTab = ({
  panelGeneral,
  fecha,
}) => {
  const panelSedes = useMemo(() => {
    if (!panelGeneral) return [];
    // Todas las sedes (oficinas y bodegas): los movimientos de contabilidad
    // pueden vivir en unas u otras, y los totales deben sumar igual que las filas.
    return (panelGeneral._sedes ?? []).map((s) => {
        const ing = (panelGeneral.ingresos?.porSede ?? []).find(
          (r) => r.sedeId === s.id,
        );
        const egr = (panelGeneral.egresos?.porSede ?? []).find(
          (r) => r.sedeId === s.id,
        );
        const ingV = toNumber(ing?.total);
        const egrV = toNumber(egr?.total);
        return {
          sede: s.nombre,
          sedeId: s.id,
          efectivo: toNumber(ing?.efectivo),
          cuentas: toNumber(ing?.cuentas),
          ingresos: ingV,
          egresos: egrV,
          saldoNeto: ingV - egrV,
        };
      });
  }, [panelGeneral]);

  const saldoNeto =
    toNumber(panelGeneral?.ingresos?.total) -
    toNumber(panelGeneral?.egresos?.total);

  return (
    <div className="panel-general">
      <div className="panel-kpis mt-3">
        <TarjetaKpi
          titulo="Ingresos del dia"
          icono="trending_up"
          color="#4ade80"
          valor={formatCOP(panelGeneral.ingresos?.total)}
          subtitulo={`Ingresos de ${formatFecha(fecha)}`}
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
          valor={new Intl.NumberFormat("es-CO").format(
            panelGeneral.totalStockUnidades,
          )}
          subtitulo="Total acumulado por sedes"
        />
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
                <div className="panel-sede-card__row">
                  <span>Efectivo</span> <strong>{formatCOP(s.efectivo)}</strong>
                </div>
                <div className="panel-sede-card__row">
                  <span>Cuentas</span> <strong>{formatCOP(s.cuentas)}</strong>
                </div>
                <div className="panel-sede-card__row">
                  <span>Ingresos</span>{" "}
                  <strong className="panel-green">
                    {formatCOP(s.ingresos)}
                  </strong>
                </div>
                <div className="panel-sede-card__row">
                  <span>Egresos</span>{" "}
                  <strong className="panel-red">{formatCOP(s.egresos)}</strong>
                </div>
                <div className="panel-sede-card__row">
                  <span>Saldo neto</span>
                  <strong
                    className={s.saldoNeto >= 0 ? "panel-green" : "panel-red"}
                  >
                    {formatCOP(s.saldoNeto)}
                  </strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PanelGeneralTab;
