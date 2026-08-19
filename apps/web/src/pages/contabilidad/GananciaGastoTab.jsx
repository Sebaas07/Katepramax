import { memo } from "react";
import { formatCOP, formatFecha } from "@/utils/formatters";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import TarjetaKpi from "./TarjetaKpi";
import { EmptyState, Spinner } from "./ContabilidadUI";

/**
 * GananciaGastoTab
 *
 * Corte de caja: cuánto se recaudó (lo que cobraron los entregadores en la
 * calle: efectivo + transferencia + abonos a deuda anterior) vs. cuánto se
 * gastó (egresos: viáticos, nómina, prestación de servicios, etc.) en el
 * período elegido (día / quincena / mes). La ganancia es simplemente
 * recaudo - egresos.
 *
 * Los datos ya vienen calculados del backend (GET /reportes/corte-caja);
 * este componente solo los presenta y ofrece la opción de imprimir.
 */
const GananciaGastoTab = ({
  periodo,
  onPeriodoChange,
  fechaReferencia,
  onFechaReferenciaChange,
  corte,
  cargando,
}) => {
  const handleImprimir = () => window.print();

  return (
    <div className="cont-ganancia-gasto">
      <div className="cont-ganancia-gasto__filtros">
        <div className="filter-group">
          <label htmlFor="gg-periodo">Período</label>
          <select
            id="gg-periodo"
            value={periodo}
            onChange={(e) => onPeriodoChange(e.target.value)}
            className="filter-select"
          >
            <option value="dia">Corte del día</option>
            <option value="quincena">Quincenal</option>
            <option value="mes">Mensual</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="gg-fecha">
            {periodo === "dia" ? "Día" : periodo === "quincena" ? "Quincena de" : "Mes de"}
          </label>
          <DatePicker
            id="gg-fecha"
            value={fechaReferencia}
            onChange={(e) => onFechaReferenciaChange(e.target.value)}
            className="filter-select"
          />
        </div>
        <button
          type="button"
          className="cont-ganancia-gasto__imprimir"
          onClick={handleImprimir}
          disabled={!corte}
        >
          <span className="material-symbols-outlined" aria-hidden="true">print</span>
          Imprimir corte
        </button>
      </div>

      {cargando && <Spinner texto="Calculando corte de caja..." />}

      {!cargando && !corte && (
        <EmptyState
          icono="point_of_sale"
          titulo="No hay datos para el período seleccionado."
          detalle="Verifica que existan entregas confirmadas o egresos en este rango."
        />
      )}

      {!cargando && corte && (
        <div className="cont-ganancia-gasto__contenido" id="corte-caja-imprimible">
          <div className="cont-ganancia-gasto__rango-print">
            Corte de caja: {formatFecha(corte.desde)}
            {corte.desde !== corte.hasta ? ` — ${formatFecha(corte.hasta)}` : ""}
          </div>

          <div className="panel-kpis">
            <TarjetaKpi
              titulo="Recaudado por entregadores"
              icono="local_shipping"
              color="#4ade80"
              valor={formatCOP(corte.recaudo.total)}
              subtitulo={`${corte.recaudo.pedidosEntregados} pedido(s) entregado(s)`}
            />
            <TarjetaKpi
              titulo="Egresos del período"
              icono="trending_down"
              color="#f87171"
              valor={formatCOP(corte.egresos.total)}
            />
            <TarjetaKpi
              titulo="Ganancia"
              icono={corte.ganancia >= 0 ? "savings" : "warning"}
              color={corte.ganancia >= 0 ? "#4ade80" : "#f87171"}
              valor={formatCOP(corte.ganancia)}
              subtitulo="Recaudado − Egresos"
            />
          </div>

          <div className="cont-ganancia-gasto__desglose">
            <div className="cont-resumen-card" style={{ "--card-accent": "#60a5fa" }}>
              <div className="cont-resumen-card__header">
                <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                <h4>Recaudo por canal</h4>
              </div>
              <div className="cont-resumen-card__filas">
                <div className="cont-resumen-card__fila">
                  <span>Efectivo</span>
                  <strong>{formatCOP(corte.recaudo.efectivo)}</strong>
                </div>
                <div className="cont-resumen-card__fila">
                  <span>Transferencia</span>
                  <strong>{formatCOP(corte.recaudo.transferencia)}</strong>
                </div>
                <div className="cont-resumen-card__fila">
                  <span>Abonos a deuda anterior</span>
                  <strong>{formatCOP(corte.recaudo.abonosDeuda)}</strong>
                </div>
                {corte.recaudo.sinClasificar > 0 && (
                  <div className="cont-resumen-card__fila">
                    <span>Pagos parciales/crédito sin canal</span>
                    <strong>{formatCOP(corte.recaudo.sinClasificar)}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="cont-resumen-card" style={{ "--card-accent": "#f87171" }}>
              <div className="cont-resumen-card__header">
                <span className="material-symbols-outlined" aria-hidden="true">receipt_long</span>
                <h4>Egresos por concepto</h4>
              </div>
              <div className="cont-resumen-card__filas">
                {corte.egresos.porConcepto.length === 0 && (
                  <span className="cont-empty__hint">Sin egresos en este período.</span>
                )}
                {corte.egresos.porConcepto.slice(0, 8).map((c, i) => (
                  <div className="cont-resumen-card__fila" key={`${c.concepto}-${i}`}>
                    <span>{c.concepto}</span>
                    <strong>{formatCOP(c.total)}</strong>
                  </div>
                ))}
              </div>
              <div className="cont-resumen-card__total">
                <span>Total</span>
                <span>{formatCOP(corte.egresos.total)}</span>
              </div>
            </div>
          </div>

          {corte.porDia.length > 1 && (
            <div className="cont-tabla-wrap">
              <table className="cont-tabla">
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Recaudado</th>
                    <th>Egresos</th>
                    <th>Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {corte.porDia.map((d) => (
                    <tr key={d.fecha}>
                      <td>{formatFecha(d.fecha)}</td>
                      <td>{formatCOP(d.recaudado)}</td>
                      <td>{formatCOP(d.egresos)}</td>
                      <td className={d.ganancia < 0 ? "cont-tabla__negativo" : ""}>
                        {formatCOP(d.ganancia)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(GananciaGastoTab);
