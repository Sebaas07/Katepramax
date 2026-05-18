import { useState, useEffect } from "react";
import { obtenerSesion, esBodegaBogota, obtenerRol } from "@/utils/sessionHelper";
import inventarioService from "@/services/inventario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./InventarioPage.css";

const InventarioPage = () => {
  const usuario = obtenerSesion();
  const rol = obtenerRol();
  const esAdminOGerente = rol === "AdminBogota" || rol === "Admin";

  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [activeTab, setActiveTab] = useState("productos"); // productos or movimientos
  const [modalMovimientoAbierto, setModalMovimientoAbierto] = useState(false);
  const [movimientoForm, setMovimientoForm] = useState({
    productoId: "",
    tipo: "entrada",
    cantidad: "",
    nota: ""
  });

  // Load data when component mounts or when tab changes
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        if (activeTab === "productos") {
          const productosData = await inventarioService.obtenerProductos();
          setProductos(productosData);
        } else if (activeTab === "movimientos") {
          const movimientosData = await inventarioService.obtenerMovimientos();
          setMovimientos(movimientosData);
        }
      } catch (error) {
        console.error("Error loading inventario data:", error);
        // Error will be handled by the service falling back to mocks
      }
    };

    cargarDatos();
  }, [activeTab]);

  // Handle form changes
  const handleCambioForm = (e) => {
    const { name, value } = e.target;
    setMovimientoForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleGuardarMovimiento = async () => {
    try {
      // Validate form
      if (!movimientoForm.productoId) {
        alert("Por favor seleccione un producto");
        return;
      }
      
      if (!movimientoForm.tipo) {
        alert("Por favor seleccione un tipo de movimiento");
        return;
      }
      
      if (!movimientoForm.cantidad || parseFloat(movimientoForm.cantidad) <= 0) {
        alert("Por favor ingrese una cantidad válida mayor a 0");
        return;
      }

      // Convert cantidad to number
      const movimientoData = {
        ...movimientoForm,
        cantidad: parseFloat(movimientoForm.cantidad)
      };

      // Save movement via service
      await inventarioService.crearMovimiento(movimientoData);
      
      // Close modal and refresh data
      setModalMovimientoAbierto(false);
      setMovimientoForm({
        productoId: "",
        tipo: "entrada",
        cantidad: "",
        nota: ""
      });
      
      // Refresh movements tab
      if (activeTab === "movimientos") {
        const movimientosData = await inventarioService.obtenerMovimientos();
        setMovimientos(movimientosData);
      }
      
      // Refresh products tab to update existencia
      if (activeTab === "productos") {
        const productosData = await inventarioService.obtenerProductos();
        setProductos(productosData);
      }
    } catch (error) {
      console.error("Error saving movement:", error);
      alert("Error al guardar el movimiento: " + error.message);
    }
  };

  // Define columns for products table
  const columnasProductos = [
    { campo: "codigo", label: "Código", tipo: "texto" },
    { campo: "nombre", label: "Nombre", tipo: "texto" },
    { campo: "departamento", label: "Departamento", tipo: "texto" },
    { campo: "existencia", label: "Existencia", tipo: "numero" },
    { campo: "precioLlegada", label: "Precio Llegada", tipo: "moneda" },
    { campo: "precioDetal", label: "Precio Detal", tipo: "moneda" },
    { campo: "precioMayoreo", label: "Precio Mayoreo", tipo: "moneda" },
    { campo: "stockMinimo", label: "Stock Mínimo", tipo: "numero" }
  ];

  // Define columns for movements table
  const columnasMovimientos = [
    { campo: "fecha", label: "Fecha", tipo: "fecha" },
    { campo: "productoNombre", label: "Producto", tipo: "texto" },
    { campo: "tipo", label: "Tipo", tipo: "estado" },
    { campo: "cantidad", label: "Cantidad", tipo: "numero" },
    { campo: "nota", label: "Nota", tipo: "texto" },
    { campo: "usuarioNombre", label: "Usuario", tipo: "texto" }
  ];

  return (
    <div className="inventario-page">
      <div className="page-header">
        <h1>Gestión de Inventario</h1>
        <div className="tabs">
          <button 
            className={`${activeTab === "productos" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("productos")}
          >
            Productos
          </button>
          <button 
            className={`${activeTab === "movimientos" ? "tab-active" : ""}`}
            onClick={() => setActiveTab("movimientos")}
          >
            Movimientos
          </button>
        </div>
      </div>

      {activeTab === "productos" && (
        <div className="tab-content">
          <div className="page-actions">
            <h2>Lista de Productos</h2>
            {esAdminOGerente && (
              <button 
                className="btn-primary"
                onClick={() => {
                  // In a real app, this would open a product creation modal
                  alert("Funcionalidad de creación de productos en desarrollo");
                }}
              >
                Nuevo Producto
              </button>
            )}
          </div>
          
          <TablaGenerica
            columnas={columnasProductos}
            datos={productos}
            filasPorPagina={10}
            mostrarBuscador={true}
            buscarEnCampos={["codigo", "nombre", "departamento"]}
            paginacion={true}
          />
        </div>
      )}

      {activeTab === "movimientos" && (
        <div className="tab-content">
          <div className="page-actions">
            <h2>Historial de Movimientos</h2>
            <div className="action-buttons">
              <button 
                className="btn-secondary"
                onClick={() => setModalMovimientoAbierto(true)}
                disabled={!esAdminOGerente}
              >
                Nuevo Movimiento
              </button>
              <button 
                className="btn-outline"
                onClick={() => {
                  // Export functionality would go here
                  alert("Funcionalidad de exportación en desarrollo");
                }}
              >
                Exportar
              </button>
            </div>
          </div>
          
          <TablaGenerica
            columnas={columnasMovimientos}
            datos={movimientos}
            filasPorPagina={10}
            mostrarBuscador={true}
            buscarEnCampos={["productoNombre", "tipo", "nota", "usuarioNombre"]}
            paginacion={true}
          />
        </div>
      )}

      {/* Modal for creating new movement */}
      <Modal
        isOpen={modalMovimientoAbierto}
        onClose={() => setModalMovimientoAbierto(false)}
        titulo="Registrar Movimiento de Inventario"
        onConfirmar={handleGuardarMovimiento}
        mostrarCancelar={true}
      >
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="producto-select">Producto:</label>
            <select
              id="producto-select"
              name="productoId"
              value={movimientoForm.productoId}
              onChange={handleCambioForm}
              className="form-control"
              required
            >
              <option value="">-- Seleccione un producto --</option>
              {productos.map(producto => (
                <option key={producto.id} value={producto.id}>
                  {producto.codigo} - {producto.nombre}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="tipo-select">Tipo de Movimiento:</label>
            <select
              id="tipo-select"
              name="tipo"
              value={movimientoForm.tipo}
              onChange={handleCambioForm}
              className="form-control"
              required
            >
              <option value="entrada">Entrada</option>
              <option value="salida">Salida</option>
              <option value="ajuste">Ajuste</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="cantidad-input">Cantidad:</label>
            <input
              id="cantidad-input"
              type="number"
              name="cantidad"
              value={movimientoForm.cantidad}
              onChange={handleCambioForm}
              className="form-control"
              min="0.01"
              step="0.01"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="nota-textarea">Nota:</label>
            <textarea
              id="nota-textarea"
              name="nota"
              value={movimientoForm.nota}
              onChange={handleCambioForm}
              className="form-control"
              rows="3"
              placeholder="Observaciones sobre el movimiento..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventarioPage;