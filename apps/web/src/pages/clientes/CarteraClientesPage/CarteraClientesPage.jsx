import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import clientesService from "@/services/clientes.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./CarteraClientesPage.css";

const Spinner = () => (
  <div className="cc-spinner-wrap">
    <div className="cc-spinner" />
    <span>Cargando cartera...</span>
  </div>
);

const CarteraClientesPage = () => {
  const { esAdmin, esBodega, isAuthenticated, isSessionChecked } = useAuth();
  const puedeAbonar = esAdmin || esBodega;

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [filtros, setFiltros] = useState({ activo: "" });

  const [modalAbonoAbierto, setModalAbonoAbierto] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [montoAbono, setMontoAbono] = useState("");

  const cargarClientes = useCallback(async () => {
    setCargando(true);
    try {
      const data = await clientesService.obtenerClientes(filtros);
      setClientes(data);
    } catch (err) {
      toast.error("Error al cargar cartera: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    cargarClientes();
  }, [isSessionChecked, isAuthenticated, cargarClientes]);

  const handleCambioFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const abrirModalAbono = (cliente) => {
    setClienteSeleccionado(cliente);
    setMontoAbono("");
    setModalAbonoAbierto(true);
  };

  const handleAbonar = async () => {
    if (!clienteSeleccionado) return;
    const valor = parseFloat(montoAbono);
    if (isNaN(valor) || valor <= 0) {
      toast.error("Ingresa un monto válido mayor a 0.");
      return;
    }
    if (valor > Number(clienteSeleccionado.saldoDeuda)) {
      toast.error("El abono no puede ser mayor al saldo deuda actual.");
      return;
    }

    setGuardando(true);
    try {
      await clientesService.abonarCliente(clienteSeleccionado.id, valor);
      toast.success("Abono registrado correctamente.");
      setModalAbonoAbierto(false);
      setMontoAbono("");
      await cargarClientes();
    } catch (err) {
      toast.error("Error al registrar abono: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const columnas = [
    { campo: "nombre", label: "Nombre", tipo: "texto" },
    { campo: "telefono", label: "Teléfono", tipo: "texto" },
    { campo: "saldoDeuda", label: "Saldo deuda", tipo: "moneda" },
    { campo: "limiteCredito", label: "Límite crédito", tipo: "moneda" },
  ];

  const accionesCliente = (cliente) => {
    const acciones = [];
    if (puedeAbonar && Number(cliente.saldoDeuda) > 0) {
      acciones.push({
        label: "Abonar",
        icon: "payments",
        variante: "success",
        onClick: () => abrirModalAbono(cliente),
      });
    }
    return acciones;
  };

  return (
    <div className="cc-page">
      <div className="page-header">
        <h1>Cartera de Clientes</h1>
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="cc-filtro-activo">Estado</label>
            <select
              id="cc-filtro-activo"
              name="activo"
              value={filtros.activo}
              onChange={handleCambioFiltro}
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={clientes}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["nombre", "telefono"]}
            paginacion
            renderAcciones={accionesCliente}
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
            Cliente: <strong>{clienteSeleccionado?.nombre}</strong>
          </p>
          <p className="cc-abono-saldo">
            Saldo actual:{" "}
            <strong>
              $
              {Number(clienteSeleccionado?.saldoDeuda ?? 0).toLocaleString(
                "es-CO",
              )}
            </strong>
          </p>
          <div className="form-group">
            <label htmlFor="cc-monto">Monto del abono (COP) *</label>
            <input
              id="cc-monto"
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

export default CarteraClientesPage;
