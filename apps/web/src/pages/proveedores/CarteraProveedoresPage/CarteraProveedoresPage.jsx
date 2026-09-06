import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import inventarioService from "@/services/inventario.service";
import contabilidadService from "@/services/contabilidad.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./CarteraProveedoresPage.css";

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
    setModalAbonoAbierto(true);
  };

  const handleAbonar = async () => {
    if (!proveedorSeleccionado) return;
    const valor = parseFloat(montoAbono);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Ingresa un monto válido mayor a 0.");
      return;
    }
    if (valor > Number(proveedorSeleccionado.saldoPendiente)) {
      toast.error("El abono no puede ser mayor al saldo pendiente del proveedor.");
      return;
    }

    setGuardando(true);
    try {
      await contabilidadService.registrarPagoProveedor({
        fecha: new Date().toISOString().split("T")[0],
        proveedorId: proveedorSeleccionado.proveedorId,
        valorPagado: valor,
        observacion: "Abono desde cartera de proveedores",
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
    const acciones = [];
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
        textoBotonConfirmar={guardando ? "Guardando..." : "Abonar"}
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
            <label htmlFor="cp-monto">Monto del abono (COP) *</label>
            <input
              id="cp-monto"
              type="number"
              name="montoAbono"
              value={montoAbono}
              onChange={(e) => setMontoAbono(e.target.value)}
              className="form-control"
              min="0"
              step="1000"
              placeholder="0"
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CarteraProveedoresPage;
