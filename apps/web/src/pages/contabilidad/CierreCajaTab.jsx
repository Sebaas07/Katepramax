import { memo, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { formatCOP, formatFecha, getSemanaISO, getRangoSemana } from "@/utils/formatters";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import reporteService from "@/services/reporte.service";
import TarjetaKpi from "./TarjetaKpi";
import { EmptyState, Spinner } from "./ContabilidadUI";
import CorteCajaTicket from "./CorteCajaTicket";

/**
 * CierreCajaTab
 *
 * modo = "diario"  → solo cierre del día (DatePicker de fecha)
 * modo = "semanal" → solo cierre de la semana (selector de semana)
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

const CierreCajaTab = ({ sedeId, esAdmin, modo = "diario" }) => {
  const HOY = new Date().toISOString().split("T")[0];
  const SEM_ACTUAL = getSemanaISO(new Date());

  const [fechaDia, setFechaDia] = useState(HOY);
  const [semanaSel, setSemanaSel] = useState(String(SEM_ACTUAL));
  const [corte, setCorte] = useState(null);
  const [datosKey, setDatosKey] = useState(null);
  const [cargando, setCargando] = useState(true);

  const esDiario = modo !== "semanal";
  const semanaNum = parseInt(semanaSel, 10) || SEM_ACTUAL;
  const rangoSemana = getRangoSemana(semanaNum);
  const semanaDesdeFecha = getSemanaISO(new Date(`${fechaDia}T00:00:00`));

  const claveActual = esDiario ? fechaDia : `${rangoSemana.inicio}|${rangoSemana.fin}`;

  useEffect(() => {
    let activo = true;
    const sede = esAdmin ? sedeId || undefined : undefined;

    setCargando(true);
    const params = esDiario
      ? { desde: fechaDia, hasta: fechaDia, sedeId: sede }
      : { desde: rangoSemana.inicio, hasta: rangoSemana.fin, sedeId: sede };

    reporteService
      .obtenerCorteCaja(params)
      .then((data) => {
        if (!activo) return;
        setCorte(data);
        setDatosKey(claveActual);
      })
      .catch((err) => {
        if (!activo) return;
        toast.error("Error al cargar el cierre de caja: " + (err?.message || "desconocido"));
        setCorte(null);
        setDatosKey(claveActual);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [
    esDiario,
    fechaDia,
    rangoSemana.inicio,
    rangoSemana.fin,
    sedeId,
    esAdmin,
    claveActual,
  ]);

  const handleImprimir = () => window.print();

  const tituloBloque = esDiario ? "Cierre diario" : "Cierre semanal";
  const subtituloBloque = esDiario
    ? formatFecha(fechaDia)
    : `${formatFecha(rangoSemana.inicio)} — ${formatFecha(rangoSemana.fin)}`;
  const tituloTicket = esDiario ? "CIERRE DE CAJA DIARIO" : "CIERRE DE CAJA SEMANAL";
  const iconoBloque = esDiario ? "today" : "date_range";
  const tituloKpi = esDiario ? "Ganancia del día" : "Ganancia de la semana";
  const colorKpi = corte?.ganancia >= 0 ? (esDiario ? "#4ade80" : "#60a5fa") : "#f87171";
  const subtituloKpi = esDiario
    ? corte
      ? formatFecha(corte.desde)
      : "Sin movimientos"
    : corte
      ? `Semana ${semanaNum}`
      : "Sin movimientos";

  return (
    <div className="cont-cierre-caja">
      <div className="cont-cierre-caja__filtros">
        {esDiario ? (
          <div className="filter-group">
            <label htmlFor="cc-fecha">Día</label>
            <DatePicker
              id="cc-fecha"
              value={fechaDia}
              max={HOY}
              onChange={(e) => setFechaDia(e.target.value)}
              className="filter-select"
            />
          </div>
        ) : (
          <>
            <div className="filter-group">
              <label htmlFor="cc-semana">Semana</label>
              <input
                id="cc-semana"
                type="number"
                min="1"
                max="53"
                value={semanaSel}
                onChange={(e) => setSemanaSel(e.target.value)}
                className="filter-select"
                style={{ minWidth: 72 }}
              />
            </div>
            <span className="cont-cierre-caja__semana">
              {formatFecha(rangoSemana.inicio)} — {formatFecha(rangoSemana.fin)}
            </span>
          </>
        )}
        {esDiario && (
          <span className="cont-cierre-caja__semana">
            Semana {semanaDesdeFecha}
          </span>
        )}
        <button
          type="button"
          className="cont-ganancia-gasto__imprimir"
          onClick={handleImprimir}
          disabled={!corte}
        >
          <span className="material-symbols-outlined" aria-hidden="true">print</span>
          Imprimir cierre
        </button>
      </div>

      {cargando || datosKey !== claveActual ? (
        <Spinner texto="Calculando cierre de caja..." />
      ) : !corte ? (
        <EmptyState
          icono="point_of_sale"
          titulo={esDiario ? "No hay datos para el día seleccionado." : "No hay datos para la semana seleccionada."}
          detalle="Verifica que existan entregas confirmadas o egresos en este período."
        />
      ) : (
        <div id="cierre-caja-imprimible">
          <div className="panel-kpis">
            <TarjetaKpi
              titulo={tituloKpi}
              icono={iconoBloque}
              color={colorKpi}
              valor={formatCOP(corte?.ganancia ?? 0)}
              subtitulo={subtituloKpi}
            />
          </div>

          <div className="cont-cierre-caja__bloques">
            <BloqueCierre
              titulo={tituloBloque}
              subtitulo={subtituloBloque}
              icono={iconoBloque}
              corte={corte}
              cargando={false}
            />
          </div>
        </div>
      )}

      {corte && (
        <CorteCajaTicket
          corte={corte}
          titulo={tituloTicket}
          subtitulo={subtituloBloque}
        />
      )}
    </div>
  );
};

export default memo(CierreCajaTab);
