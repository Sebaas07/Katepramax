import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import inventarioService from "@/services/inventario.service";
import contabilidadService from "@/services/contabilidad.service";
import { getSemanaISO, formatCOP } from "@/utils/formatters";
import { MAX_COMPROBANTE, sanitizarTextoInput } from "@/utils/contabilidadForm";
import { obtenerSedeUsuario } from "@/utils/permisos";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import "./CarteraProveedoresPage.css";

const hoyISO = () => new Date().toISOString().split("T")[0];

const parseMaybeNumber = (valor) => {
  const numero = Number(
    String(valor ?? "")
      .replace(/\./g, "")
      .replace(",", "."),
  );
  return Number.isFinite(numero) ? numero : 0;
};

const Spinner = () => (
  <div className="cc-spinner-wrap">
    <div className="cc-spinner" />
    <span>Cargando cartera de proveedores...</span>
  </div>
);

const CarteraProveedoresPage = () => {
  const { esAdmin, esBodega, esOficinista, isAuthenticated, isSessionChecked } = useAuth();
  const puedeAbonar = esAdmin || esBodega || esOficinista;
  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalAbonoAbierto, setModalAbonoAbierto] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [montoAbono, setMontoAbono] = useState("");
  const [fechaAbono, setFechaAbono] = useState(hoyISO());
  const [comprobanteAbono, setComprobanteAbono] = useState("");
  const [observacionAbono, setObservacionAbono] = useState("");
  const [erroresAbono, setErroresAbono] = useState({});

  const cargarProveedores = useCallback(async () => {
    setCargando(true);
    try {
      const data = await inventarioService.obtenerDeudaProveedores();
      setProveedores(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Error al cargar la cartera de proveedores: " + err.message);
      setProveedores([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => { void cargarProveedores(); }, 0);
    return () => window.clearTimeout(id);
  }, [isSessionChecked, isAuthenticated, cargarProveedores]);

  // Solo tiene sentido abonar a proveedores que realmente deben algo
  const proveedoresConDeuda = useMemo(
    () => proveedores.filter((p) => Number(p.saldoPendiente) > 0),
    [proveedores],
  );

  const abrirModalAbono = (proveedor) => {
    setProveedorSeleccionado(proveedor);
    setMontoAbono("");
    setFechaAbono(hoyISO());
    setComprobanteAbono("");
    setObservacionAbono("");
    setErroresAbono({});
    setModalAbonoAbierto(true);
  };

  const handleAbonar = async () => {
    if (!proveedorSeleccionado) return;
    const valor = parseMaybeNumber(montoAbono);
    if (!fechaAbono) {
      setErroresAbono({ fecha: "Selecciona la fecha." });
      return;
    }
    if (valor <= 0) {
      setErroresAbono({ valorAbono: "Ingresa un valor de abono mayor a cero." });
      return;
    }
    if (valor > Number(proveedorSeleccionado.saldoPendiente)) {
      setErroresAbono({ valorAbono: "El abono no puede ser mayor al saldo pendiente del proveedor." });
      return;
    }
    const sedeId = obtenerSedeUsuario();
    if (!sedeId) {
      setErroresAbono({ sedeIdError: "No se pudo determinar la sede del usuario." });
      return;
    }

    setGuardando(true);
    try {
      await contabilidadService.registrarPagoProveedor({
        fecha: fechaAbono,
        semana: getSemanaISO(new Date(`${fechaAbono}T00:00:00`)),
        sedeId,
        proveedorId: proveedorSeleccionado.proveedorId,
        valorPagado: valor,
        comprobante: comprobanteAbono
          ? sanitizarTextoInput(comprobanteAbono, MAX_COMPROBANTE)
          : undefined,
        observacion: observacionAbono
          ? sanitizarTextoInput(observacionAbono, 500)
          : "Abono desde cartera de proveedores",
      });
      toast.success("Abono registrado correctamente.");
      setModalAbonoAbierto(false);
      setMontoAbono("");
      await cargarProveedores();
    } catch (err) {
      toast.error("Error al registrar abono: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const columnas = [
    { campo: "proveedor", label: "Proveedor", tipo: "texto" },
    { campo: "deudaPendiente", label: "Deuda", tipo: "moneda" },
    { campo: "totalAbonado", label: "Total abonado", tipo: "moneda" },
    { campo: "saldoPendiente", label: "Saldo pendiente", tipo: "moneda" },
  ];

  const accionesProveedor = (proveedor) => {
    const acciones = [
      {
        label: "Ver historial",
        icon: "history",
        onClick: () =>
          navigate(`/proveedores/cartera/historial/${proveedor.proveedorId}`),
      },
    ];
    if (puedeAbonar && Number(proveedor.saldoPendiente) > 0) {
      acciones.push({
        label: "Abonar",
        icon: "payments",
        variante: "success",
        onClick: () => abrirModalAbono(proveedor),
      });
    }
    return acciones;
  };

  return (
    <div className="cc-page">
      <div className="page-header">
        <div className="cc-header-titulo">
          <button
            type="button"
            className="cc-volver"
            onClick={() => navigate(-1)}
            aria-label="Volver atrás"
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
          <h1>Cartera de Proveedores</h1>
        </div>
      </div>

      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : proveedoresConDeuda.length === 0 ? (
          <div className="cc-empty">
            <span className="material-symbols-outlined" aria-hidden="true">check_circle</span>
            <p>Ningún proveedor tiene saldo pendiente por ahora.</p>
          </div>
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={proveedoresConDeuda}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["proveedor"]}
            paginacion
            renderAcciones={accionesProveedor}
          />
        )}
      </div>

      <Modal
        isOpen={modalAbonoAbierto}
        onClose={() => setModalAbonoAbierto(false)}
        titulo="Registrar Abono"
        textoBotonConfirmar={guardando ? "Guardando..." : "Guardar"}
        onConfirmar={handleAbonar}
        mostrarCancelar
      >
        <div className="modal-form">
          <p className="cc-abono-info">
            Proveedor: <strong>{proveedorSeleccionado?.proveedor}</strong>
          </p>
          <p className="cc-abono-saldo">
            Saldo pendiente:{" "}
            <strong>
              $
              {Number(proveedorSeleccionado?.saldoPendiente ?? 0).toLocaleString(
                "es-CO",
              )}
            </strong>
          </p>

          <div className="form-group">
            <label htmlFor="cc-fecha" className="cont-modal-label">
              Fecha <span style={{ color: "var(--aged-gold)", marginLeft: 4 }}>*</span>
            </label>
            <DatePicker
              id="cc-fecha"
              name="fecha"
              max={hoyISO()}
              value={fechaAbono}
              onChange={(e) => setFechaAbono(e.target.value)}
              className={`form-control ${erroresAbono.fecha ? "cont-input--error" : ""}`}
            />
            {erroresAbono.fecha && (
              <span className="cont-modal-error" role="alert">{erroresAbono.fecha}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="cc-valor" className="cont-modal-label">
              Valor del Abono (COP) <span style={{ color: "var(--aged-gold)", marginLeft: 4 }}>*</span>
            </label>
            <input
              id="cc-valor"
              type="number"
              name="valorAbono"
              min="1"
              step="1000"
              placeholder="0"
              value={montoAbono}
              onChange={(e) => setMontoAbono(e.target.value)}
              className={`form-control ${erroresAbono.valorAbono ? "cont-input--error" : ""}`}
              autoFocus
            />
            {montoAbono && (
              <span className="cont-input-hint">{formatCOP(parseMaybeNumber(montoAbono))}</span>
            )}
            {erroresAbono.valorAbono && (
              <span className="cont-modal-error" role="alert">{erroresAbono.valorAbono}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="cc-comprobante" className="cont-modal-label">
              Nº de comprobante de pago
            </label>
            <input
              id="cc-comprobante"
              type="text"
              name="comprobante"
              placeholder="Número del recibo o comprobante..."
              value={comprobanteAbono}
              onChange={(e) =>
                setComprobanteAbono(sanitizarTextoInput(e.target.value, MAX_COMPROBANTE))
              }
              className="form-control"
              maxLength={MAX_COMPROBANTE}
            />
          </div>

          <div className="form-group">
            <label htmlFor="cc-observacion" className="cont-modal-label">
              Observación
            </label>
            <input
              id="cc-observacion"
              type="text"
              name="observacion"
              placeholder="Concepto del abono..."
              value={observacionAbono}
              onChange={(e) =>
                setObservacionAbono(sanitizarTextoInput(e.target.value, 500))
              }
              className="form-control"
              maxLength={500}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CarteraProveedoresPage;
