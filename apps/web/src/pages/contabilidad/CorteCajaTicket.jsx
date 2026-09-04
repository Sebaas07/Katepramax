import TicketTermico, {
  TicketCentro,
  TicketLinea,
  TicketRazon,
  TicketSep,
  TicketSubtitulo,
  TicketTitulo,
  TicketTotal,
} from "@/components/common/TicketTermico/TicketTermico";
import { formatCOP } from "@/utils/formatters";

/**
 * CorteCajaTicket — Katepramax
 * Ticket POS 58mm para el cierre/corte de caja (GET /reportes/corte-caja),
 * impreso en la impresora térmica como el recibo de compra.
 *
 * Props:
 *  corte     — datos del corte (recaudo, egresos, ganancia, desde, hasta)
 *  titulo    — ej. "CIERRE DE CAJA DIARIO" / "CORTE DE CAJA"
 *  subtitulo — período mostrado, ej. "05/09/2026" o "01/09/2026 — 05/09/2026"
 */
const CorteCajaTicket = ({ corte, titulo, subtitulo }) => {
  if (!corte) return null;

  const { recaudo, egresos, ganancia } = corte;

  return (
    <TicketTermico>
      <TicketCentro>
        <TicketRazon>KATEPRAMAX</TicketRazon>
      </TicketCentro>

      <TicketSep />

      <TicketCentro>
        <TicketTitulo>{titulo}</TicketTitulo>
        {subtitulo && <TicketSubtitulo>{subtitulo}</TicketSubtitulo>}
      </TicketCentro>

      <TicketSep />

      <TicketLinea
        etiqueta="Recaudado"
        valor={formatCOP(recaudo.total)}
      />
      <TicketLinea
        etiqueta="Pedidos entreg."
        valor={String(recaudo.pedidosEntregados ?? 0)}
      />
      <TicketLinea
        etiqueta="Efectivo"
        valor={formatCOP(recaudo.efectivo)}
      />
      <TicketLinea
        etiqueta="Transferencia"
        valor={formatCOP(recaudo.transferencia)}
      />
      <TicketLinea
        etiqueta="Abonos deuda"
        valor={formatCOP(recaudo.abonosDeuda)}
      />
      {recaudo.sinClasificar > 0 && (
        <TicketLinea
          etiqueta="Pagos sin canal"
          valor={formatCOP(recaudo.sinClasificar)}
        />
      )}

      <TicketSep />

      <TicketLinea etiqueta="Egresos" valor={formatCOP(egresos.total)} />
      {egresos.porConcepto.slice(0, 6).map((c, i) => (
        <TicketLinea
          key={`${c.concepto}-${i}`}
          sub
          etiqueta={c.concepto}
          valor={formatCOP(c.total)}
        />
      ))}
      {egresos.porConcepto.length > 6 && (
        <TicketLinea
          sub
          etiqueta={`+ ${egresos.porConcepto.length - 6} más`}
          valor=""
        />
      )}

      <TicketSep />

      <TicketTotal etiqueta="GANANCIA" valor={formatCOP(ganancia)} />
    </TicketTermico>
  );
};

export default CorteCajaTicket;