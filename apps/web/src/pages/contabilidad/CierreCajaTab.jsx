import { memo, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { formatCOP, formatFecha, getSemanaISO, getRangoSemana } from "@/utils/formatters";
import reporteService from "@/services/reporte.service";
import TarjetaKpi from "./TarjetaKpi";
import { EmptyState, Spinner } from "./ContabilidadUI";

/**
 * CierreCajaTab
 *
 * Consolida el cierre de caja del DÍA y de la SEMANA en una sola vista:
 * - Cierre diario  → GET /reportes/corte-caja?desde=hoy&hasta=hoy
 * - Cierre semanal → GET /reportes/corte-caja?desde=lunes&hasta=domingo
 *
 * Reutiliza el mismo "corte de caja" del backend (recaudo de entregadores
 * vs. egresos) para que se vea el acumulado del día y del total de la semana.
 */
const BloqueCierre = ({ titulo, subtitulo, icono, corte, cargando }) => {
  if (cargando) {
    return (
      <div className="cont-resumen-card cont-cierre-bloque">
        <div className="cont-resumen-card__header">
          <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
          <div>
            <h4>{titulo}</h4>
            <span className="cont-cierre-sub">{subtitulo}</span>
          </div>
        </div>
        <Spinner texto="Calculando..." />
      </div>
    );
  }

  if (!corte) {
    return (
      <div className="cont-resumen-card cont-cierre-bloque">
        <div className="cont-resumen-card__header">
          <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
          <div>
            <h4>{titulo}</h4>
            <span className="cont-cierre-sub">{subtitulo}</span>
          </div>
        </div>
        <span className="cont-empty__hint">Sin movimientos en este período.</span>
      </div>
    );
  }

  return (
    <div className="cont-resumen-card cont-cierre-bloque">
      <div className="cont-resumen-card__header">
        <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
        <div>
          <h4>{titulo}</h4>
          <span className="cont-cierre-sub">{subtitulo}</span>
        </div>
      </div>

      <div className="cont-cierre-bloque__kpis">
        <div className="cont-cierre-bloque__kpi">
          <span className="cont-cierre-bloque__kpi-label">Recaudado</span>
          <strong className="cont-cierre-bloque__kpi-valor cont-cierre-bloque__kpi-valor--verde">
            {formatCOP(corte.recaudo.total)}
          </strong>
          <span className="cont-cierre-bloque__kpi-detalle">
            {corte.recaudo.pedidosEntregados} pedido(s)
          </span>
        </div>
        <div className="cont-cierre-bloque__kpi">
          <span className="cont-cierre-bloque__kpi-label">Egresos</span>
          <strong className="cont-cierre-bloque__kpi-valor cont-cierre-bloque__kpi-valor--rojo">
            {formatCOP(corte.egresos.total)}
          </strong>
        </div>
        <div className="cont-cierre-bloque__kpi">
          <span className="cont-cierre-bloque__kpi-label">Ganancia</span>
          <strong
            className={`cont-cierre-bloque__kpi-valor ${
              corte.ganancia >= 0
                ? "cont-cierre-bloque__kpi-valor--verde"
                : "cont-cierre-bloque__kpi-valor--rojo"
            }`}
          >
            {formatCOP(corte.ganancia)}
          </strong>
        </div>
      </div>

      <div className="cont-cierre-bloque__canal">
        <div className="cont-cierre-bloque__fila">
          <span>Efectivo</span>
          <strong>{formatCOP(corte.recaudo.efectivo)}</strong>
        </div>
        <div className="cont-cierre-bloque__fila">
          <span>Transferencia</span>
          <strong>{formatCOP(corte.recaudo.transferencia)}</strong>
        </div>
        <div className="cont-cierre-bloque__fila">
          <span>Abonos a deuda anterior</span>
          <strong>{formatCOP(corte.recaudo.abonosDeuda)}</strong>
        </div>
        {corte.recaudo.sinClasificar > 0 && (
          <div className="cont-cierre-bloque__fila">
            <span>Pagos parciales/crédito sin canal</span>
            <strong>{formatCOP(corte.recaudo.sinClasificar)}</strong>
          </div>
        )}
      </div>
    </div>
  );
};

const CierreCajaTab = ({ sedeId, esAdmin }) => {
  const HOY = new Date().toISOString().split("T")[0];

  const [fechaDia, setFechaDia] = useState(HOY);
  const [cierreDia, setCierreDia] = useState(null);
  const [cierreSemana, setCierreSemana] = useState(null);
  const [datosFecha, setDatosFecha] = useState(null);
  const [cargando, setCargando] = useState(true);

  const semana = getSemanaISO(new Date(`${fechaDia}T00:00:00`));
  const rangoSemana = getRangoSemana(semana);

  useEffect(() => {
    let activo = true;
    const sede = esAdmin ? sedeId || undefined : undefined;

    const cargar = () => {
      Promise.all([
        reporteService.obtenerCorteCaja({
          desde: fechaDia,
          hasta: fechaDia,
          sedeId: sede,
        }),
        reporteService.obtenerCorteCaja({
          desde: rangoSemana.inicio,
          hasta: rangoSemana.fin,
          sedeId: sede,
        }),
      ])
        .then(([dia, sem]) => {
          if (!activo) return;
          setCierreDia(dia);
          setCierreSemana(sem);
          setDatosFecha(fechaDia);
        })
        .catch((err) => {
          if (!activo) return;
          toast.error("Error al cargar el cierre de caja: " + (err?.message || "desconocido"));
          setCierreDia(null);
          setCierreSemana(null);
          setDatosFecha(fechaDia);
        })
        .finally(() => {
          if (activo) setCargando(false);
        });
    };

    cargar();
    return () => {
      activo = false;
    };
  }, [fechaDia, rangoSemana.inicio, rangoSemana.fin, sedeId, esAdmin]);

  const handleImprimir = () => window.print();

  return (
    <div className="cont-cierre-caja">
      <div className="cont-cierre-caja__filtros">
        <div className="filter-group">
          <label htmlFor="cc-fecha">Día de referencia</label>
          <input
            id="cc-fecha"
            type="date"
            value={fechaDia}
            max={HOY}
            onChange={(e) => setFechaDia(e.target.value)}
            className="filter-select"
          />
        </div>
        <span className="cont-cierre-caja__semana">
          Semana ISO {semana}: {formatFecha(rangoSemana.inicio)} — {formatFecha(rangoSemana.fin)}
        </span>
        <button
          type="button"
          className="cont-ganancia-gasto__imprimir"
          onClick={handleImprimir}
          disabled={!cierreDia && !cierreSemana}
        >
          <span className="material-symbols-outlined" aria-hidden="true">print</span>
          Imprimir cierre
        </button>
      </div>

      {cargando || datosFecha !== fechaDia ? (
        <Spinner texto="Calculando cierre de caja..." />
      ) : (!cierreDia && !cierreSemana) ? (
        <EmptyState
          icono="point_of_sale"
          titulo="No hay datos para el día seleccionado."
          detalle="Verifica que existan entregas confirmadas o egresos en este período."
        />
      ) : (
        <div id="cierre-caja-imprimible">
          <div className="panel-kpis">
            <TarjetaKpi
              titulo="Ganancia del día"
              icono="today"
              color={cierreDia?.ganancia >= 0 ? "#4ade80" : "#f87171"}
              valor={formatCOP(cierreDia?.ganancia ?? 0)}
              subtitulo={cierreDia ? formatFecha(cierreDia.desde) : "Sin movimientos"}
            />
            <TarjetaKpi
              titulo="Ganancia de la semana"
              icono="date_range"
              color={cierreSemana?.ganancia >= 0 ? "#60a5fa" : "#f87171"}
              valor={formatCOP(cierreSemana?.ganancia ?? 0)}
              subtitulo={cierreSemana ? `Semana ${semana}` : "Sin movimientos"}
            />
          </div>

          <div className="cont-cierre-caja__bloques">
            <BloqueCierre
              titulo="Cierre diario"
              subtitulo={formatFecha(fechaDia)}
              icono="today"
              corte={cierreDia}
              cargando={false}
            />
            <BloqueCierre
              titulo="Cierre semanal"
              subtitulo={`${formatFecha(rangoSemana.inicio)} — ${formatFecha(rangoSemana.fin)}`}
              icono="date_range"
              corte={cierreSemana}
              cargando={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CierreCajaTab);