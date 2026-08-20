import { QRCodeCanvas } from "qrcode.react";
import { obtenerUrlFactura } from "@/utils/facturaUrl";
import "./FacturaTicket.css";

const fmtMoneda = (n) =>
  Number(n || 0).toLocaleString("es-CO", { minimumFractionDigits: 0 });

/**
 * FacturaTicket — Katepramax
 * Ticket de factura de venta en formato 58mm (impresora térmica POS de punto
 * de venta, papel 58mm — ancho imprimible 48mm).
 *
 * Props:
 *  factura   — datos del comprobante devueltos por GET /pedidos/:id/factura
 *  mostrarQR — incluye el QR de validación (por defecto true)
 *  url       — URL a codificar en el QR (por defecto se calcula sola)
 *
 * Para imprimir SOLO el ticket con window.print(), el contenedor padre debe
 * tener la clase `factura-print-area` (ver @media print en el CSS).
 */
const FacturaTicket = ({ factura, mostrarQR = true, url }) => {
  const link = url ?? obtenerUrlFactura(factura.id);
  const fecha = factura.fecha ? new Date(factura.fecha) : null;

  return (
    <div className="factura-ticket">
      <div className="factura-ticket__centro">
        <strong className="factura-ticket__razon">KATEPRAMAX</strong>
        <span className="factura-ticket__sede">{factura.emisor}</span>
      </div>

      <div className="factura-ticket__sep" />

      <div className="factura-ticket__centro">
        <strong className="factura-ticket__titulo">FACTURA DE VENTA</strong>
        <span className="factura-ticket__folio">No. {factura.id}</span>
      </div>

      <div className="factura-ticket__sep" />

      <div className="factura-ticket__linea">
        <span>Fecha:</span>
        <span>{fecha ? fecha.toLocaleString("es-CO") : "—"}</span>
      </div>
      <div className="factura-ticket__linea">
        <span>Cliente:</span>
        <span>{factura.cliente}</span>
      </div>
      {factura.telefonoCliente && (
        <div className="factura-ticket__linea">
          <span>Teléfono:</span>
          <span>{factura.telefonoCliente}</span>
        </div>
      )}
      {factura.direccion && (
        <div className="factura-ticket__linea">
          <span>Dirección:</span>
          <span>{factura.direccion}</span>
        </div>
      )}

      <div className="factura-ticket__sep" />

      <div className="factura-ticket__encabezado-items">
        <span>PRODUCTO</span>
        <span>VALOR</span>
      </div>
      {(factura.detalles ?? []).map((d, i) => (
        <div className="factura-ticket__item" key={i}>
          <div className="factura-ticket__item-nombre">{d.nombre}</div>
          <div className="factura-ticket__item-detalle">
            <span>
              {d.cantidad} x {fmtMoneda(d.precioUnitario)}
            </span>
            <span>{fmtMoneda(d.subtotal)}</span>
          </div>
        </div>
      ))}

      <div className="factura-ticket__sep" />

      <div className="factura-ticket__total">
        <span>TOTAL</span>
        <strong>{fmtMoneda(factura.total)}</strong>
      </div>

      {factura.metodoPago && (
        <div className="factura-ticket__linea">
          <span>Pago:</span>
          <span>{factura.metodoPago}</span>
        </div>
      )}
      {factura.totalRecibido != null && (
        <div className="factura-ticket__linea">
          <span>Recibido:</span>
          <span>{fmtMoneda(factura.totalRecibido)}</span>
        </div>
      )}
      {factura.valorDomicilio > 0 && (
        <div className="factura-ticket__linea">
          <span>Domicilio:</span>
          <span>{fmtMoneda(factura.valorDomicilio)}</span>
        </div>
      )}

      <div className="factura-ticket__sep" />

      {mostrarQR && (
        <div className="factura-ticket__qr">
          <QRCodeCanvas value={link} size={80} level="M" includeMargin />
          <span className="factura-ticket__qr-texto">
            Valide este documento escaneando el código
          </span>
        </div>
      )}

      <div className="factura-ticket__centro">
        <span className="factura-ticket__url">{link}</span>
      </div>
    </div>
  );
};

export default FacturaTicket;