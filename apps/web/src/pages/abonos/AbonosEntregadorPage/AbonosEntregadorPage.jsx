import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import clientesService from "@/services/clientes.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./AbonosEntregadorPage.css";

const Spinner = () => (
  <div className="ab-spinner-wrap">
    <div className="ab-spinner" />
    <span>Cargando clientes con deuda...</span>
  </div>
);

/**
 * Módulo del entregador: cobrar abonos a clientes con deuda,
 * sin necesidad de un pedido asignado.
 */
const AbonosEntregadorPage = () => {
  const { isAuthenticated, isSessionChecked } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [modalAbonoAbierto, setModalAbonoAbierto] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [montoAbono, setMontoAbono] = useState("");

  const cargarClientes = useCallback(async (nombre = "") => {
    setCargando(true);
    try {
      const data = await clientesService.obtenerClientes({
        nombre: nombre.trim() || undefined,
        soloConDeuda: "true",
        activo: "true",
        take: 100,
      });
      setClientes(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Error al cargar clientes: " + (err.message || err));
      setClientes([]);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => {
      void cargarClientes("");
    }, 0);
    return () => window.clearTimeout(id);
  }, [isSessionChecked, isAuthenticated, cargarClientes]);

  // Debounce búsqueda por nombre (backend)
  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => {
      void cargarClientes(busqueda);
    }, 350);
    return () => window.clearTimeout(id);
  }, [busqueda, isSessionChecked, isAuthenticated, cargarClientes]);

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
      await cargarClientes(busqueda);
    } catch (err) {
      toast.error("Error al registrar abono: " + (err.message || err));
    } finally {
      setGuardando(false);
    }
  };

  const columnas = [
    { campo: "nombre", label: "Nombre", tipo: "texto" },
    { campo: "telefono", label: "Teléfono", tipo: "texto" },
    { campo: "sedeNombre", label: "Sede", tipo: "texto" },
    { campo: "saldoDeuda", label: "Saldo deuda", tipo: "moneda" },
  ];

  const datosTabla = clientes.map((c) => ({
    ...c,
    sedeNombre: c.sede?.nombre ?? "—",
  }));

  const accionesCliente = (cliente) => {
    if (Number(cliente.saldoDeuda) <= 0) return [];
    return [
      {
        label: "Abonar",
        icon: "payments",
        variante: "success",
        onClick: () => abrirModalAbono(cliente),
      },
    ];
  };

  return (
    <div className="ab-page">
      <div className="page-header">
        <div>
          <h1>Abonos</h1>
          <p className="ab-subtitulo">
            Cobrar a clientes con deuda de tus sedes, sin necesidad de un pedido
          </p>
        </div>
        <div className="ab-buscador">
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input
            type="search"
            className="form-control"
            placeholder="Buscar cliente por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar cliente por nombre"
          />
        </div>
      </div>

      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : datosTabla.length === 0 ? (
          <div className="ab-empty">
            <span className="material-symbols-outlined" aria-hidden="true">
              check_circle
            </span>
            <p>
              {busqueda.trim()
                ? "No hay clientes con deuda que coincidan con la búsqueda."
                : "Ningún cliente de tus sedes tiene saldo en deuda por ahora."}
            </p>
          </div>
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={datosTabla}
            filasPorPagina={10}
            mostrarBuscador={false}
            paginacion
            renderAcciones={accionesCliente}
          />
        )}
      </div>

      <Modal
        isOpen={modalAbonoAbierto}
        onClose={() => setModalAbonoAbierto(false)}
        titulo="Registrar abono"
        textoBotonConfirmar={guardando ? "Guardando..." : "Abonar"}
        onConfirmar={handleAbonar}
        mostrarCancelar
      >
        <div className="modal-form">
          <p className="ab-abono-info">
            Cliente: <strong>{clienteSeleccionado?.nombre}</strong>
          </p>
          {clienteSeleccionado?.sede?.nombre && (
            <p className="ab-abono-sede">
              Sede: {clienteSeleccionado.sede.nombre}
            </p>
          )}
          <p className="ab-abono-saldo">
            Saldo actual:{" "}
            <strong>
              $
              {Number(clienteSeleccionado?.saldoDeuda ?? 0).toLocaleString(
                "es-CO",
              )}
            </strong>
          </p>
          <div className="form-group">
            <label htmlFor="ab-monto">Monto del abono (COP) *</label>
            <input
              id="ab-monto"
              type="number"
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

export default AbonosEntregadorPage;
