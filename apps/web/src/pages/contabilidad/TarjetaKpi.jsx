import { memo } from "react";

const TarjetaKpi = memo(({ titulo, icono, color, valor, subtitulo }) => (
  <div className="panel-kpi-card" style={{ "--kpi-color": color }}>
    <div className="panel-kpi-card__icon">
      <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
    </div>
    <div className="panel-kpi-card__body">
      <span className="panel-kpi-card__valor">{valor}</span>
      <span className="panel-kpi-card__titulo">{titulo}</span>
      {subtitulo && <span className="panel-kpi-card__sub">{subtitulo}</span>}
    </div>
  </div>
));

export default TarjetaKpi;
