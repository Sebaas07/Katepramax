import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import pedidosService from "@/services/pedidos.service";
import FacturaTicket from "@/components/common/FacturaTicket/FacturaTicket";
import "./FacturaValidacionPage.css";

/**
 * FacturaValidacionPage — Katepramax
 * Página PÚBLICA (sin login) a la que apunta el QR de la factura.
 * Permite al cliente validar el comprobante e imprimirlo en una impresora POS.
 */
const FacturaValidacionPage = () => {
  const { token } = useParams();
  const [factura, setFactura] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    (async (tokenFactura) => {
      try {
        setCargando(true);
        setError("");
        const data = await pedidosService.obtenerFactura(tokenFactura);
        if (activo && data) setFactura(data);
      } catch (e) {
        if (activo)
          setError(
            e?.response?.data?.error || e?.message || "Error al cargar.",
          );
      } finally {
        if (activo) setCargando(false);
      }
    })(token);

    return () => {
      activo = false;
    };
  }, [token]);

  if (cargando) {
    return (
      <div className="factura-publica">
        <div className="factura-publica__carga">
          <div className="factura-publica__carga-orb" aria-hidden="true" />
          <strong>Cargando recibo</strong>
          <span>Validando comprobante…</span>
        </div>
      </div>
    );
  }

  if (error || !factura) {
    return (
      <div className="factura-publica">
        <div className="factura-publica__card">
          <span className="material-symbols-outlined factura-publica__icono">
            receipt_long
          </span>
          <h1>Documento no encontrado</h1>
          <p>{error || "Factura no encontrada."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="factura-publica">
      <div className="factura-publica__card">
        <div className="factura-publica__aviso">
          <span className="material-symbols-outlined">verified</span>
          <p>
            <strong>Recibo de compra válido</strong> generado por Katepramax.
            Consérvelo como comprobante de su compra.
          </p>
        </div>

        {/* Vista previa en pantalla (el ticket real para imprimir se
         * monta aparte en un portal — ver .factura-print-area más abajo). */}
        <div className="factura-publica__preview" aria-hidden="true">
          <FacturaTicket factura={factura} />
        </div>

        {createPortal(
          <div className="factura-print-area">
            <FacturaTicket factura={factura} />
          </div>,
          document.body,
        )}

        <button
          type="button"
          className="factura-publica__btn"
          onClick={() => window.print()}
        >
          <span className="material-symbols-outlined">print</span>
          Imprimir recibo
        </button>
      </div>
    </div>
  );
};

export default FacturaValidacionPage;
