import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import clientesService from "@/services/clientes.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./ClientePage.css";

// ─── Spinner inline ──────────────────────────────────────────
const Spinner = () => (
  <div className="cli-spinner-wrap">
    <div className="cli-spinner" />
    <span>Cargando clientes...</span>
  </div>
);

// ─── Form inicial alineado con schema Prisma ──────────────────
// Schema real: nombre, telefono, limiteCredito, saldoDeuda, activo
const FORM_INICIAL = {
  nombre: "",
  telefono: "",
  limiteCredito: "10000000",
  saldoDeuda: "0",
  activo: true,
};

const ClientePage = () => {
  const { esAdmin, esBodega, isAuthenticated, isSessionChecked } = useAuth();
  const puedeEditar = esAdmin || esBodega;
  const puedeCrear  = esAdmin || esBodega;
  const puedeDesactivar = esAdmin;

  // ── Estado ────────────────────────────────────────────────
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [filtros, setFiltros] = useState({ activo: "" });

  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [modalConfirmAbierto, setModalConfirmAbierto] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [formCliente, setFormCliente] = useState(FORM_INICIAL);

  // ── Carga de datos ────────────────────────────────────────
  const cargarClientes = useCallback(async () => {
    setCargando(true);
    try {
      const data = await clientesService.obtenerClientes(filtros);
      setClientes(data);
    } catch (err) {
      toast.error("Error al cargar clientes: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [filtros]);

useEffect(() => {
     if (!isSessionChecked || !isAuthenticated) return;
     // eslint-disable-next-line react-hooks/set-state-in-effect
     cargarClientes();
   }, [cargarClientes, isSessionChecked, isAuthenticated]);

  // ── Handlers ──────────────────────────────────────────────
  const handleCambioFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
  };

  const handleCambioForm = (e) => {
    const { name, value, type, checked } = e.target;
    setFormCliente((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const abrirModalNuevo = () => {
    setClienteSeleccionado(null);
    setFormCliente(FORM_INICIAL);
    setModalClienteAbierto(true);
  };

  const abrirModalEditar = (cliente) => {
    setClienteSeleccionado(cliente);
    setFormCliente({
      nombre:        cliente.nombre        ?? "",
      telefono:      cliente.telefono      ?? "",
      limiteCredito: String(cliente.limiteCredito ?? "10000000"),
      saldoDeuda:    String(cliente.saldoDeuda    ?? "0"),
      activo:        cliente.activo        ?? true,
    });
    setModalClienteAbierto(true);
  };

  const abrirModalConfirm = (cliente) => {
    setClienteSeleccionado(cliente);
    setModalConfirmAbierto(true);
  };

  // ── Guardar (crear / editar) ──────────────────────────────
  const handleGuardarCliente = async () => {
    if (!formCliente.nombre.trim()) {
      toast("El nombre del cliente es obligatorio.", { icon: "⚠️" });
      return;
    }

    const payload = {
      nombre:        formCliente.nombre.trim(),
      telefono:      formCliente.telefono.trim() || null,
      limiteCredito: parseFloat(formCliente.limiteCredito) || 10000000,
      saldoDeuda:    parseFloat(formCliente.saldoDeuda)    || 0,
      activo:        formCliente.activo,
    };

    setGuardando(true);
    try {
      if (clienteSeleccionado) {
        await clientesService.actualizarCliente(clienteSeleccionado.id, payload);
        toast.success("Cliente actualizado correctamente.");
      } else {
        await clientesService.crearCliente(payload);
        toast.success("Cliente creado correctamente.");
      }
      setModalClienteAbierto(false);
      setFormCliente(FORM_INICIAL);
      await cargarClientes();
    } catch (err) {
      toast.error("Error al guardar cliente: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Desactivar / reactivar ────────────────────────────────
  const handleDesactivar = async () => {
    if (!clienteSeleccionado) return;
    setGuardando(true);
    try {
      await clientesService.desactivarCliente(clienteSeleccionado.id);
      toast.success("Cliente desactivado.");
      setModalConfirmAbierto(false);
      await cargarClientes();
    } catch (err) {
      toast.error("Error al desactivar cliente: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleReactivar = async (cliente) => {
    try {
      await clientesService.actualizarCliente(cliente.id, { activo: true });
      toast.success("Cliente reactivado.");
      await cargarClientes();
    } catch (err) {
      toast.error("Error al reactivar cliente: " + err.message);
    }
  };

  // ── Columnas ──────────────────────────────────────────────
  const columnas = [
    { campo: "nombre",        label: "Nombre",         tipo: "texto"   },
    { campo: "telefono",      label: "Teléfono",       tipo: "texto"   },
    { campo: "saldoDeuda",    label: "Saldo deuda",    tipo: "moneda"  },
    { campo: "limiteCredito", label: "Límite crédito", tipo: "moneda"  },
    { campo: "activo",        label: "Estado",         tipo: "booleano"},
    { campo: "creadoEn",      label: "Registro",       tipo: "fecha"   },
  ];

  const accionesCliente = (cliente) => {
    const acciones = [];
    if (puedeEditar) {
      acciones.push({
        label: "Editar",
        icon: "edit",
        onClick: () => abrirModalEditar(cliente),
      });
    }
    if (puedeDesactivar && cliente.activo) {
      acciones.push({
        label: "Desactivar",
        icon: "person_off",
        variante: "danger",
        onClick: () => abrirModalConfirm(cliente),
      });
    }
    if (puedeDesactivar && !cliente.activo) {
      acciones.push({
        label: "Reactivar",
        icon: "person",
        variante: "success",
        onClick: () => handleReactivar(cliente),
      });
    }
    return acciones;
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="clientes-page">
      {/* Header */}
      <div className="page-header">
        <h1>Gestión de Clientes</h1>

        <div className="filters">
          {/* Filtro estado */}
          <div className="filter-group">
            <label htmlFor="cli-filtro-activo">Estado</label>
            <select
              id="cli-filtro-activo"
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

          {/* Botón crear */}
          {puedeCrear && (
            <button
              className="btn-primary"
              onClick={abrirModalNuevo}
              type="button"
            >
              <span className="material-symbols-outlined">person_add</span>
              Nuevo cliente
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
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

      {/* Modal — Crear / Editar */}
      <Modal
        isOpen={modalClienteAbierto}
        onClose={() => setModalClienteAbierto(false)}
        titulo={clienteSeleccionado ? "Editar Cliente" : "Nuevo Cliente"}
        textoBotonConfirmar={guardando ? "Guardando..." : "Guardar"}
        onConfirmar={handleGuardarCliente}
        mostrarCancelar
      >
        <div className="modal-form">
          {/* Nombre */}
          <div className="form-group">
            <label htmlFor="cli-nombre">Nombre *</label>
            <input
              id="cli-nombre"
              type="text"
              name="nombre"
              value={formCliente.nombre}
              onChange={handleCambioForm}
              className="form-control"
              placeholder="Nombre del cliente o empresa"
            />
          </div>

          {/* Teléfono */}
          <div className="form-group">
            <label htmlFor="cli-telefono">Teléfono</label>
            <input
              id="cli-telefono"
              type="tel"
              name="telefono"
              value={formCliente.telefono}
              onChange={handleCambioForm}
              className="form-control"
              placeholder="3XX XXX XXXX"
            />
          </div>

          {/* Límite de crédito */}
          <div className="form-group">
            <label htmlFor="cli-limite">Límite de crédito (COP)</label>
            <input
              id="cli-limite"
              type="number"
              name="limiteCredito"
              value={formCliente.limiteCredito}
              onChange={handleCambioForm}
              className="form-control"
              min="0"
              step="1000"
            />
          </div>

          {/* Saldo deuda (solo edición) */}
          {clienteSeleccionado && (
            <div className="form-group">
              <label htmlFor="cli-deuda">Saldo de deuda (COP)</label>
              <input
                id="cli-deuda"
                type="number"
                name="saldoDeuda"
                value={formCliente.saldoDeuda}
                onChange={handleCambioForm}
                className="form-control"
                min="0"
                step="1000"
              />
            </div>
          )}

          {/* Activo */}
          <div className="form-group form-group--check">
            <label htmlFor="cli-activo" className="cli-check-label">
              <input
                id="cli-activo"
                type="checkbox"
                name="activo"
                checked={formCliente.activo}
                onChange={handleCambioForm}
                className="cli-checkbox"
              />
              Cliente activo
            </label>
          </div>
        </div>
      </Modal>

      {/* Modal — Confirmar desactivar */}
      <Modal
        isOpen={modalConfirmAbierto}
        onClose={() => setModalConfirmAbierto(false)}
        titulo="Desactivar Cliente"
        textoBotonConfirmar={guardando ? "Desactivando..." : "Sí, desactivar"}
        onConfirmar={handleDesactivar}
        mostrarCancelar
      >
        <div className="cli-confirm-body">
          <span className="material-symbols-outlined cli-confirm-icon">
            warning
          </span>
          <p>
            ¿Estás seguro de que quieres desactivar a{" "}
            <strong>{clienteSeleccionado?.nombre}</strong>?
          </p>
          <p className="cli-confirm-sub">
            El cliente no aparecerá en nuevos pedidos pero su historial se
            conserva.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default ClientePage;
