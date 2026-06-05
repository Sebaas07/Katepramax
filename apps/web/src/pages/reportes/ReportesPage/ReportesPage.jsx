import "./ReportesPage.css";

/**
 * ReportesPage — Katepramax
 * Sprint 5 — Reportes consolidados del sistema.
 * El backend necesita implementar GET /reportes/* para activar este módulo.
 */
const REPORTES_PREVIEW = [
  { icon: "point_of_sale",    label: "Ventas del día",           sprint: 5 },
  { icon: "receipt_long",     label: "Corte de caja",            sprint: 5 },
  { icon: "delivery_dining",  label: "Cobros por entregador",    sprint: 5 },
  { icon: "inventory_2",      label: "Stock bajo",               sprint: 5 },
  { icon: "account_balance",  label: "Clientes con deuda",       sprint: 5 },
  { icon: "summarize",        label: "Resumen semanal",          sprint: 5 },
];

const ReportesPage = () => {
  return (
    <div className="reportes-page">
      <div className="page-header">
        <div>
          <h1>Reportes</h1>
          <p className="reportes-subtitulo">
            Análisis y exportación de datos del sistema
          </p>
        </div>
      </div>

      <div className="reportes-aviso">
        <span className="material-symbols-outlined">info</span>
        <p>
          Los reportes estarán disponibles en el <strong>Sprint 5</strong>,
          cuando el backend implemente los endpoints{" "}
          <code>GET /reportes/*</code>.
        </p>
      </div>

      <div className="reportes-grid">
        {REPORTES_PREVIEW.map((r, i) => (
          <div key={i} className="reporte-card reporte-card--disabled">
            <div className="reporte-card__icono">
              <span className="material-symbols-outlined">{r.icon}</span>
            </div>
            <div className="reporte-card__info">
              <span className="reporte-card__label">{r.label}</span>
              <span className="reporte-card__sprint">Sprint {r.sprint}</span>
            </div>
            <span className="material-symbols-outlined reporte-card__lock">
              lock
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportesPage;
