import "./AuditLogPage.css";

/**
 * AuditLogPage — Katepramax
 * Sprint 5 — Historial completo de acciones del sistema.
 * El backend necesita implementar GET /audit-log para activar este módulo.
 */
const AuditLogPage = () => {
  return (
    <div className="auditlog-page">
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <p className="auditlog-subtitulo">
            Historial de acciones del sistema
          </p>
        </div>
      </div>

      <div className="auditlog-placeholder">
        <div className="auditlog-placeholder__icono-wrap">
          <span className="material-symbols-outlined">history_edu</span>
        </div>
        <h2>Módulo en construcción</h2>
        <p>
          El historial de acciones estará disponible en el Sprint 5,
          cuando el backend implemente el endpoint{" "}
          <code>GET /audit-log</code>.
        </p>
        <div className="auditlog-preview">
          <p className="auditlog-preview__titulo">Registrará:</p>
          <ul className="auditlog-preview__lista">
            <li>
              <span className="material-symbols-outlined">person</span>
              Usuario que realizó la acción
            </li>
            <li>
              <span className="material-symbols-outlined">schedule</span>
              Fecha y hora exacta
            </li>
            <li>
              <span className="material-symbols-outlined">category</span>
              Módulo y acción específica
            </li>
            <li>
              <span className="material-symbols-outlined">fingerprint</span>
              ID de entidad afectada
            </li>
            <li>
              <span className="material-symbols-outlined">router</span>
              IP del cliente
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AuditLogPage;
