import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import clientesService from "@/services/clientes.service";
import inventarioService from "@/services/inventario.service";
import ClienteContenido from "./ClienteContenido";
import "./ClientePage.css";

// ─── Form inicial alineado con schema Prisma ──────────────────
// Schema real: nombre, telefono, limiteCredito, saldoDeuda, activo
const FORM_INICIAL = {
  nombre: "",
  telefono: "",
  sedeId: "",
  limiteCredito: "10000000",
  saldoDeuda: "0",
  activo: true,
};

const ClientePage = () => {
  const { esAdmin, esBodega, esOficinista, isAuthenticated, isSessionChecked } = useAuth();
  const puedeEditar = esAdmin || esBodega || esOficinista;
  const puedeCrear = esAdmin || esBodega || esOficinista;
  const puedeDesactivar = esAdmin;
  const puedeAbonar = esAdmin || esBodega;

  // ── Estado ────────────────────────────────────────────────
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [filtros, setFiltros] = useState({ activo: "" });

  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [modalConfirmAbierto, setModalConfirmAbierto] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [formCliente, setFormCliente] = useState(FORM_INICIAL);

  const [sedes, setSedes] = useState([]);
  const [cargandoSedes, setCargandoSedes] = useState(false);

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

  // ── Carga de sedes desde la DB ──────────────────────────
  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    let activo = true;
    const cargarSedes = async () => {
      setCargandoSedes(true);
      try {
        const data = await inventarioService.obtenerSedes();
        if (activo) setSedes(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error al cargar sedes:", err);
        if (activo) setSedes([]);
      } finally {
        if (activo) setCargandoSedes(false);
      }
    };
    void cargarSedes();
    return () => {
      activo = false;
    };
  }, [isSessionChecked, isAuthenticated]);

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
      nombre: cliente.nombre ?? "",
      telefono: cliente.telefono ?? "",
      sedeId: cliente.sedeId != null ? String(cliente.sedeId) : "",
      limiteCredito: String(cliente.limiteCredito ?? "10000000"),
      saldoDeuda: String(cliente.saldoDeuda ?? "0"),
      activo: cliente.activo ?? true,
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
      nombre: formCliente.nombre.trim(),
      telefono: formCliente.telefono.trim() || null,
      limiteCredito: parseFloat(formCliente.limiteCredito) || 10000000,
      saldoDeuda: parseFloat(formCliente.saldoDeuda) || 0,
      activo: formCliente.activo,
    };
    if (esAdmin && formCliente.sedeId !== "") {
      payload.sedeId = parseInt(formCliente.sedeId, 10);
    }

    setGuardando(true);
    try {
      if (clienteSeleccionado) {
        await clientesService.actualizarCliente(
          clienteSeleccionado.id,
          payload,
        );
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
          {puedeAbonar && (
            <button
              className="btn-primary"
              onClick={() => (window.location.href = "/clientes/cartera")}
              type="button"
            >
              <span className="material-symbols-outlined">
                account_balance_wallet
              </span>
              Cartera de clientes
            </button>
          )}
        </div>
      </div>

      <ClienteContenido
        cargando={cargando}
        clientes={clientes}
        accionesCliente={accionesCliente}
        modalClienteAbierto={modalClienteAbierto}
        modalConfirmAbierto={modalConfirmAbierto}
        clienteSeleccionado={clienteSeleccionado}
        formCliente={formCliente}
        sedes={sedes}
        esAdmin={esAdmin}
        cargandoSedes={cargandoSedes}
        guardando={guardando}
        onCerrarCliente={() => setModalClienteAbierto(false)}
        onCerrarConfirmacion={() => setModalConfirmAbierto(false)}
        onGuardar={handleGuardarCliente}
        onDesactivar={handleDesactivar}
        onCambioForm={handleCambioForm}
      />
    </div>
  );
};

export default ClientePage;
