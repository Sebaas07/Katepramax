import { createPortal } from "react-dom";
import "./TicketTermico.css";

/**
 * TicketTermico — Katepramax
 * Contenedor de impresión POS 58mm (mismo patrón que el recibo):
 * se monta vía React Portal directo en <body> y permanece `display:none`
 * en pantalla. Solo dentro de @media print se muestra a 58mm, ocultando
 * el resto de la app con `body:has(.ticket-termico-print)`.
 *
 * Uso:
 *   {datos && (
 *     <TicketTermico>
 *       <div className="ticket-centro">...</div>
 *       <TicketSep />
 *       <TicketLinea etiqueta="Efectivo" valor="$100.000" />
 *     </TicketTermico>
 *   )}
 */
const TicketTermico = ({ children }) =>
  createPortal(
    <div className="ticket-termico-print">
      <div className="ticket-58">{children}</div>
    </div>,
    document.body,
  );

export const TicketSep = () => <div className="ticket-sep" />;

export const TicketCentro = ({ children }) => (
  <div className="ticket-centro">{children}</div>
);

export const TicketRazon = ({ children }) => (
  <strong className="ticket-razon">{children}</strong>
);

export const TicketTitulo = ({ children }) => (
  <strong className="ticket-titulo">{children}</strong>
);

export const TicketSubtitulo = ({ children }) => (
  <span className="ticket-subtitulo">{children}</span>
);

export const TicketLinea = ({ etiqueta, valor, sub = false }) => (
  <div className={`ticket-linea${sub ? " ticket-linea--sub" : ""}`}>
    <span>{etiqueta}</span>
    <strong>{valor}</strong>
  </div>
);

export const TicketTotal = ({ etiqueta, valor }) => (
  <div className="ticket-total">
    <span>{etiqueta}</span>
    <strong>{valor}</strong>
  </div>
);

export default TicketTermico;