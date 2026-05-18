import { useState, useEffect } from "react";
import { obtenerSesion, esBodegaBogota, obtenerRol } from "@/utils/sessionHelper";
import pedidosService from "@/services/pedidos.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./PedidosPage.css";

const PedidosPage = () => {
  const usuario = obtenerSesion();
  const rol = obtenerRol();
  const esAdmin = rol === "AdminBogota" || rol === "Admin";

  const [pedidos, setPedidos] = useState([]);
  const [entregadores, setEntregadores] = useState([]);
  const [filtros, setFiltros] = useState({
    estado: "",
    sede: ""
  });
  const [modalPedidoAbierto, setModalPedidoAbierto] = useState(false);
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [formPedido, setFormPedido] = useState({
    cliente: "",
    direccion: "",
    sedeId: "",
    items: [{ productoId: "", cantidad: "", precioUnitario: "" }]
  });
  const [formAsignar, setFormAsignar] = useState({
    entregadorId: ""
  });

  // Load data when component mounts or when filters change
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [pedidosData, entregadoresData] = await Promise.all([
          pedidosService.obtenerPedidos(filtros),
          pedidosService.obtenerEntregadoresDisponibles()
        ]);
        setPedidos(pedidosData);
        setEntregadores(entregadoresData);
      } catch (error) {
        console.error("Error loading pedidos data:", error);
        // Error will be handled by the service falling back to mocks
      }
    };

    cargarDatos();
  }, [filtros]);

  // Handle filter changes
  const handleCambioFiltro = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form changes for pedido
  const handleCambioFormPedido = (e) => {
    const { name, value } = e.target;
    if (name === "items") {
      // Special handling for items array
      setFormPedido(prev => {
        const itemsArray = [...prev.items];
        // Find which item index we're updating based on the name format
        // For simplicity, we'll reset items when needed
        return {
          ...prev,
          items: [{ productoId: "", cantidad: "", precioUnitario: "" }]
        };
      });
    } else {
      setFormPedido(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle adding/removing items
  const handleAgregarItem = () => {
    setFormPedido(prev => ({
      ...prev,
      items: [...prev.items, { productoId: "", cantidad: "", precioUnitario: "" }]
    }));
  };

  const handleEliminarItem = (index) => {
    if (formPedido.items.length > 1) {
      setFormPedido(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // Handle form submission for new pedido
  const handleGuardarPedido = async () => {
    try {
      // Validate form
      if (!formPedido.cliente) {
        alert("Por favor ingrese el nombre del cliente");
        return;
      }
      
      if (!formPedido.direccion) {
        alert("Por favor ingrese la dirección");
        return;
      }
      
      if (!formPedido.sedeId) {
        alert("Por favor seleccione la sede");
        return;
      }
      
      if (!formPedido.items || formPedido.items.length === 0) {
        alert("Por favor agregue al menos un ítem");
        return;
      }

      // Validate each item
      const itemsValidos = formPedido.items.filter(item => 
        item.productoId && 
        item.cantidad && 
        parseFloat(item.cantidad) > 0 &&
        item.precioUnitario && 
        parseFloat(item.precioUnitario) >= 0
      );

      if (itemsValidos.length === 0) {
        alert("Por favor ingrese ítems válidos con producto, cantidad y precio");
        return;
      }

      // Prepare data for submission
      const pedidoData = {
        cliente: formPedido.cliente,
        direccion: formPedido.direccion,
        sedeId: formPedido.sedeId,
        items: formPedido.items.map(item => ({
          productoId: item.productoId,
          cantidad: parseFloat(item.cantidad),
          precioUnitario: parseFloat(item.precioUnitario)
        }))
      };

      // Save pedido via service
      await pedidosService.crearPedido(pedidoData);
      
      // Close modal and refresh data
      setModalPedidoAbierto(false);
      setFormPedido({
        cliente: "",
        direccion: "",
        sedeId: "",
        items: [{ productoId: "", cantidad: "", precioUnitario: "" }]
      });
      
      // Refresh pedidos
      const pedidosData = await pedidosService.obtenerPedidos(filtros);
      setPedidos(pedidosData);
    } catch (error) {
      console.error("Error saving pedido:", error);
      alert("Error al guardar el pedido: " + error.message);
    }
  };

  // Handle form submission for asignar entregador
  const handleAsignarEntregador = async () => {
    try {
      if (!pedidoSeleccionado) {
        alert("No hay pedido seleccionado");
        return;
      }
      
      if (!formAsignar.entregadorId) {
        alert("Por favor seleccione un entregador");
        return;
      }

      // Assign entregador via service
      await pedidosService.asignarEntregador(
        pedidoSeleccionado.id, 
        formAsignar.entregadorId
      );
      
      // Close modal and refresh data
      setModalAsignarAbierto(false);
      setFormAsignar({ entregadorId: "" });
      
      // Refresh pedidos
      const pedidosData = await pedidosService.obtenerPedidos(filtros);
      setPedidos(pedidosData);
    } catch (error) {
      console.error("Error assigning entregador:", error);
      alert("Error al asignar el entregador: " + error.message);
    }
  };

  // Define columns for pedidos table
  const columnasPedidos = [
    { campo: "codigo", label: "Código", tipo: "texto" },
    { campo: "cliente", label: "Cliente", tipo: "texto" },
    { campo: "direccion", label: "Dirección", tipo: "texto" },
    { campo: "sede", label: "Sede", tipo: "texto" },
    { campo: "estado", label: "Estado", tipo: "estado" },
    { campo: "entregador", label: "Entregador", tipo: "texto" },
    { campo: "total", label: "Total", tipo: "moneda" },
    { campo: "fechaCreacion", label: "Fecha", tipo: "fecha" }
  ];

  // Define available actions based on role and pedido state
  const getAccionesPedido = (pedido) => {
    const acciones = [];
    
    // All roles can view details (implicit in table)
    
    // Only Admin/Bodega can create/edit
    if (esAdmin) {
      acciones.push({ 
        label: "Crear Pedido", 
        onClick: () => {
          setModalPedidoAbierto(true);
          setFormPedido({
            cliente: "",
            direccion: "",
            sedeId: "",
            items: [{ productoId: "", cantidad: "", precioUnitario: "" }]
          });
        }
      });
    }
    
    // Only Admin/Bodega can assign entregador to pendiente pedidos
    if (esAdmin && pedido.estado === "pendiente") {
      acciones.push({ 
        label: "Asignar Entregador", 
        onClick: () => {
          setPedidoSeleccionado(pedido);
          setFormAsignar({ entregadorId: "" });
          setModalAsignarAbierto(true);
        }
      });
    }
    
    return acciones;
  };

  return (
    <div className="pedidos-page">
      <div className="page-header">
        <h1>Gestión de Pedidos</h1>
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="estado-filter">Estado:</label>
            <select
              id="estado-filter"
              value={filtros.estado}
              onChange={handleCambioFiltro}
              name="estado"
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="confirmado">Confirmado</option>
              <option value="en_ruta">En ruta</option>
              <option value="entregado">Entregado</option>
              <option value="fallido">Fallido</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="sede-filter">Sede:</label>
            <select
              id="sede-filter"
              value={filtros.sede}
              onChange={handleCambioFiltro}
              name="sede"
              className="filter-select"
            >
              <option value="">Todas</option>
              <option value="Bogotá">Bogotá</option>
              <option value="Cartagena">Cartagena</option>
              <option value="Villavicencio">Villavicencio</option>
            </select>
          </div>
        </div>
      </div>

      <TablaGenerica
        columnas={columnasPedidos}
        datos={pedidos}
        filasPorPagina={10}
        mostrarBuscador={true}
        buscarEnCampos={["codigo", "cliente", "direccion", "sede", "estado", "entregador"]}
        paginacion={true}
        renderAcciones={getAccionesPedido}
      />

      {/* Modal for creating new pedido */}
      <Modal
        isOpen={modalPedidoAbierto}
        onClose={() => setModalPedidoAbierto(false)}
        titulo="Nuevo Pedido"
        onConfirmar={handleGuardarPedido}
        mostrarCancelar={true}
      >
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="cliente-input">Cliente:</label>
            <input
              id="cliente-input"
              type="text"
              name="cliente"
              value={formPedido.cliente}
              onChange={handleCambioFormPedido}
              className="form-control"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="direccion-input">Dirección:</label>
            <input
              id="direccion-input"
              type="text"
              name="direccion"
              value={formPedido.direccion}
              onChange={handleCambioFormPedido}
              className="form-control"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="sede-select">Sede:</label>
            <select
              id="sede-select"
              name="sedeId"
              value={formPedido.sedeId}
              onChange={handleCambioFormPedido}
              className="form-control"
              required
            >
              <option value="">-- Seleccione una sede --</option>
              <option value="1">Bogotá</option>
              <option value="2">Cartagena</option>
              <option value="3">Villavicencio</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Ítems:</label>
            {formPedido.items.map((item, index) => (
              <div key={index} className="item-group">
                <h4>Ítem {index + 1}</h4>
                <div className="item-fields">
                  <div>
                    <label htmlFor={`producto-${index}`}>Producto:</label>
                    <select
                      id={`producto-${index}`}
                      name={`items[${index}].productoId`}
                      value={item.productoId}
                      onChange={handleCambioFormPedido}
                      className="form-control"
                      required
                    >
                      <option value="">-- Seleccione un producto --</option>
                      {/* In a real app, these would come from productos service */}
                      <option value="1">Arroz Diana x 500g</option>
                      <option value="2">Aceite Girasol x 1L</option>
                      <option value="3">Leche Alquería x 1L</option>
                      <option value="4">Huevos x 30 unidades</option>
                      <option value="5">Panela Redonda x 250g</option>
                      <option value="6">Azúcar Blanca x 1kg</option>
                      <option value="7">Frijoles Negros x 1kg</option>
                      <option value="8">Leche de Coco x 400ml</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor={`cantidad-${index}`}>Cantidad:</label>
                    <input
                      id={`cantidad-${index}`}
                      type="number"
                      name={`items[${index}].cantidad`}
                      value={item.cantidad}
                      onChange={handleCambioFormPedido}
                      className="form-control"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor={`precio-${index}`}>Precio Unitario:</label>
                    <input
                      id={`precio-${index}`}
                      type="number"
                      name={`items[${index}].precioUnitario`}
                      value={item.precioUnitario}
                      onChange={handleCambioFormPedido}
                      className="form-control"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  {formPedido.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleEliminarItem(index)}
                      className="btn-remove-item"
                    >
                      Eliminar Ítem
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            <button 
              type="button" 
              onClick={handleAgregarItem}
              className="btn-add-item"
            >
              Agregar Ítem
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal for assigning entregador */}
      <Modal
        isOpen={modalAsignarAbierto}
        onClose={() => setModalAsignarAbierto(false)}
        titulo="Asignar Entregador"
        onConfirmar={handleAsignarEntregador}
        mostrarCancelar={true}
      >
        <div className="modal-form">
          {pedidoSeleccionado && (
            <>
              <div className="form-group">
                <label>Pedido:</label>
                <p className="pedido-info">
                  <strong>{pedidoSeleccionado.codigo}</strong> - 
                  {pedidoSeleccionado.cliente}
                </p>
              </div>
              
              <div className="form-group">
                <label htmlFor="entregador-select">Entregador:</label>
                <select
                  id="entregador-select"
                  name="entregadorId"
                  value={formAsignar.entregadorId}
                  onChange={e => setFormAsignar({ entregadorId: e.target.value })}
                  className="form-control"
                  required
                >
                  <option value="">-- Seleccione un entregador --</option>
                  {entregadores.map(entregador => (
                    <option key={entregador.id} value={entregador.id}>
                      {entregador.nombreCompleto}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default PedidosPage;