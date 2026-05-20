import { useState, useEffect } from "react";
import { obtenerRol } from "@/utils/sessionHelper";
import clientesService from "@/services/clientes.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./ClientePage.css";
import { toast } from "react-hot-toast";

const ClientePage = () => {
  const rol = obtenerRol();
  const esAdmin = rol === "AdminBogota" || rol === "Admin";
  const esBodega = rol === "Bodega" || esAdmin; // Bodega y Admin pueden ver y editar

  const [clientes, setClientes] = useState([]);
  const [filtros, setFiltros] = useState({
    activo: "", // Filtrar por activos/inactivos (true/false o vacío para todos)
  });
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [formCliente, setFormCliente] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    email: "",
    activo: true,
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const clientesData = await clientesService.obtenerClientes(filtros);
        setClientes(clientesData);
      } catch (error) {
        toast.error("Error al cargar los datos de clientes: " + error.message);
      }
    };

    cargarDatos();
  }, [filtros]);

  const handleCambioFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCambioFormCliente = (e) => {
    const { name, value, type, checked } = e.target;
    const valor = type === "checkbox" ? checked : value;
    setFormCliente((prev) => ({
      ...prev,
      [name]: valor,
    }));
  };

  const handleGuardarCliente = async () => {
    try {
      if (!formCliente.nombre) {
        toast("Por favor ingrese el nombre del cliente", {
          icon: "⚠️",
          style: { borderRadius: "10px", background: "#333", color: "#fff" },
        });
        return;
      }

      if (!formCliente.identificacion) {
        toast("Por favor ingrese la identificación", {
          icon: "⚠️",
          style: { borderRadius: "10px", background: "#333", color: "#fff" },
        });
        return;
      }

      // Preparar datos para enviar al backend
      const clienteData = {
        nombre: formCliente.nombre,
        telefono: formCliente.telefono,
        direccion: formCliente.direccion,
        email: formCliente.email,
        activo: formCliente.activo,
      };

      if (clienteSeleccionado) {
        // Actualizar cliente existente
        await clientesService.actualizarCliente(
          clienteSeleccionado.id,
          clienteData,
        );
        toast.success("Cliente actualizado exitosamente", { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
      } else {
        // Crear nuevo cliente
        await clientesService.crearCliente(clienteData);
        toast.success("Cliente creado exitosamente", { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
      }

      // Cerrar modal, resetear formulario y refrescar datos
      setModalClienteAbierto(false);
      setFormCliente({
        nombre: "",
        telefono: "",
        direccion: "",
        email: "",
        activo: true,
      });

      const clientesData = await clientesService.obtenerClientes(filtros);
      setClientes(clientesData);
    } catch (error) {
      console.error("Error saving cliente:", error);
      toast.error("Error al guardar el cliente: " + error.message, { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
    }
  };

  // Handle eliminar (desactivar) cliente
  const handleEliminarCliente = async () => {
    try {
      if (!clienteSeleccionado) {
        toast("No hay cliente seleccionado", {
          icon: "⚠️",
          style: { borderRadius: "10px", background: "#333", color: "#fff" },
        });
        return;
      }

      // Desactivar cliente vía service
      await clientesService.desactivarCliente(clienteSeleccionado.id);

      // Cerrar modal y refrescar datos
      setModalEliminarAbierto(false);
      const clientesData = await clientesService.obtenerClientes(filtros);
      setClientes(clientesData);

      toast.success("Cliente desactivado exitosamente", { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
    } catch (error) {
      console.error("Error desactivando cliente:", error);
      toast.error("Error al desactivar el cliente: " + error.message, { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
    }
  };

  // Define columnas para la tabla de clientes
  const columnasClientes = [
    { campo: "nombre", label: "Nombre", tipo: "texto" },
    { campo: "telefono", label: "Teléfono", tipo: "texto" },
    { campo: "email", label: "Email", tipo: "texto" },
    { campo: "direccion", label: "Dirección", tipo: "texto" },
    { campo: "activo", label: "Estado", tipo: "estado" }, // Asumimos que tenemos un componente EstadoBadge
  ];

  // Definir acciones para cada cliente en la tabla
  const getAccionesCliente = (cliente) => {
    const acciones = [];

    // Only Admin/Bodega can edit
    if (esBodega) {
      acciones.push({
        label: "Editar",
        onClick: () => {
          setClienteSeleccionado(cliente);
          setFormCliente({
            nombre: cliente.nombre,
            telefono: cliente.telefono,
            direccion: cliente.direccion,
            email: cliente.email,
            activo: cliente.activo,
          });
          setModalClienteAbierto(true);
        },
      });
    }

    // Only Admin can desactivar (delete)
    if (esAdmin && cliente.activo) {
      // Solo desactivar si está activo
      acciones.push({
        label: "Desactivar",
        onClick: () => {
          setClienteSeleccionado(cliente);
          setModalEliminarAbierto(true);
        },
      });
    }

    // Reactivar solo para admin si está inactivo
    if (esAdmin && !cliente.activo) {
      acciones.push({
        label: "Reactivar",
        onClick: async () => {
          try {
            // Para reactivar, vamos a actualizar el cliente con activo: true
            await clientesService.actualizarCliente(cliente.id, {
              activo: true,
            });
            const clientesData = await clientesService.obtenerClientes(filtros);
            setClientes(clientesData);
            toast.success("Cliente reactivado exitosamente", { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
          } catch (error) {
            console.error("Error reactivando cliente:", error);
            toast.error("Error al reactivar el cliente: " + error.message, { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
          }
        },
      });
    }

    return acciones;
  };

  return (
    <div className="clientes-page">
      <div className="page-header">
        <h1>Gestión de Clientes</h1>
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="activo-filter">Estado:</label>
            <select
              id="activo-filter"
              value={filtros.activo}
              onChange={handleCambioFiltro}
              name="activo"
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>
          </div>

          {/* Botón para crear nuevo cliente (solo Admin/Bodega) */}
          {esBodega && (
            <button
              className="btn-primary"
              onClick={() => {
                setClienteSeleccionado(null);
                setFormCliente({
                  nombre: "",
                  telefono: "",
                  direccion: "",
                  email: "",
                  activo: true,
                });
                setModalClienteAbierto(true);
              }}
            >
              Nuevo Cliente
            </button>
          )}
        </div>
      </div>

      <TablaGenerica
        columnas={columnasClientes}
        datos={clientes}
        filasPorPagina={10}
        mostrarBuscador={true}
        buscarEnCampos={[
          "nombre",
          "telefono",
          "email",
          "direccion",
        ]}
        paginacion={true}
        renderAcciones={getAccionesCliente}
      />

      {/* Modal para crear/editar cliente */}
      <Modal
        isOpen={modalClienteAbierto}
        onClose={() => setModalClienteAbierto(false)}
        titulo={clienteSeleccionado ? "Editar Cliente" : "Nuevo Cliente"}
        onConfirmar={handleGuardarCliente}
        mostrarCancelar={true}
      >
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="nombre-input">Nombre:</label>
            <input
              id="nombre-input"
              type="text"
              name="nombre"
              value={formCliente.nombre}
              onChange={handleCambioFormCliente}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="identificacion-input">Identificación:</label>
            <input
              id="identificacion-input"
              type="text"
              name="identificacion"
              value={formCliente.identificacion}
              onChange={handleCambioFormCliente}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="telefono-input">Teléfono:</label>
            <input
              id="telefono-input"
              type="tel"
              name="telefono"
              value={formCliente.telefono}
              onChange={handleCambioFormCliente}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="email-input">Email:</label>
            <input
              id="email-input"
              type="email"
              name="email"
              value={formCliente.email}
              onChange={handleCambioFormCliente}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="direccion-input">Dirección:</label>
            <input
              id="direccion-input"
              type="text"
              name="direccion"
              value={formCliente.direccion}
              onChange={handleCambioFormCliente}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="activo-checkbox">Activo:</label>
            <input
              id="activo-checkbox"
              type="checkbox"
              name="activo"
              checked={formCliente.activo}
              onChange={handleCambioFormCliente}
              className="form-control"
            />
          </div>
        </div>
      </Modal>

      {/* Modal para eliminar o desactivar cliente */}
      <Modal
        isOpen={modalEliminarAbierto}
        onClose={() => setModalEliminarAbierto(false)}
        titulo="Desactivar Cliente"
        onConfirmar={handleEliminarCliente}
        mostrarCancelar={true}
      >
        <div className="modal-form">
          {clienteSeleccionado && (
            <>
              <div className="form-group">
                <label>Cliente:</label>
                <p className="cliente-info">
                  <strong>{clienteSeleccionado.nombre}</strong> -
                  {clienteSeleccionado.identificacion}
                </p>
              </div>

              <div className="form-group">
                <p>
                  ¿Está seguro de que desea desactivar este cliente? Esta acción
                  no se puede deshacer.
                </p>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ClientePage;
