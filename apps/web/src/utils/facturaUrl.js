/**
 * facturaUrl.js — Katepramax
 * URL pública de validación que se codifica en el QR de la factura.
 * Permite sobrescribir el origen con VITE_FACTURA_URL (p. ej. cuando el
 * frontend se sirve detrás de un dominio distinto al que escanea el cliente).
 */
export const obtenerUrlFactura = (pedidoId) => {
  const base = (
    import.meta.env.VITE_FACTURA_URL || window.location.origin
  ).replace(/\/+$/, "");
  return `${base}/factura/${pedidoId}`;
};