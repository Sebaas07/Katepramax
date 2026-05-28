import { useState, useEffect } from "react";
import { obtenerRol } from "@/utils/sessionHelper";
import proveedoresService from "@/services/proveedores.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./ProveedoresPage.css";
import toast from "react-hot-toast";

const ProveedoresPage = () => {
  const rol = obtenerRol();
  const esAdmin = rol === "AdminBogota" || rol === "Admin";
  const esBodega = rol === "Bodega" || esAdmin;

  const [proveedores, setProveedores] = useState([]);
  const [filtros, setFiltros] = useState({
    activo: "",
  });
  const [modalProveedorAbierto, setModalProveedorAbierto] = useState(false);
  const [modalEliminarAbierto, setModalEliminarAbierto] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null);
  const [formProveedor, setFormProveedor] = useState({
    nombre: "",
    activo: true,
  });

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const proveedoresData = await proveedoresService.obtenerProveedores(filtros);
        setProveedores(proveedoresData);
      } catch (error) {
        toast.error("Error al cargar los datos de proveedores: " + error.message);
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

  const handleCambioFormProveedor = (e) => {
    const { name, value, type, checked } = e.target;
    const valor = type === "checkbox" ? checked : value;
    setFormProveedor((prev) => ({
      ...prev,
      [name]: valor,
    }));
  };

  const handleGuardarProveedor = async () => {
    try {
      if (!formProveedor.nombre) {
        toast("Por favor ingrese el nombre del proveedor", {
          icon: "⚠️",
          style: { borderRadius: "10px", background: "#333", color: "#fff" },
        });
        return;
      }

      const proveedorData = {
        nombre: formProveedor.nombre,
        activo: formProveedor.activo,
      };

      if (proveedorSeleccionado) {
        await proveedoresService.actualizarProveedor(
          proveedorSeleccionado.id,
          proveedorData,
        );
        toast.success("Proveedor actualizado exitosamente", { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
      } else {
        await proveedoresService.crearProveedor(proveedorData);
        toast.success("Proveedor creado exitosamente", { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
      }

      setModalProveedorAbierto(false);
      setFormProveedor({
        nombre: "",
        activo: true,
      });

      const proveedoresData = await proveedoresService.obtenerProveedores(filtros);
      setProveedores(proveedoresData);
    } catch (error) {
      console.error("Error saving proveedor:", error);
      toast.error("Error al guardar el proveedor: " + error.message, { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
    }
  };

  const handleEliminarProveedor = async () => {
    try {
      if (!proveedorSeleccionado) {
        toast("No hay proveedor seleccionado", {
          icon: "⚠️",
          style: { borderRadius: "10px", background: "#333", color: "#fff" },
        });
        return;
      }

      await proveedoresService.eliminarProveedor(proveedorSeleccionado.id);

      setModalEliminarAbierto(false);
      const proveedoresData = await proveedoresService.obtenerProveedores(filtros);
      setProveedores(proveedoresData);

      toast.success("Proveedor desactivado exitosamente", { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
    } catch (error) {
      console.error("Error desactivando proveedor:", error);
      toast.error("Error al desactivar el proveedor: " + error.message, { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
    }
  };

  const columnasProveedores = [
    { campo: "nombre", label: "Nombre", tipo: "texto" },
    { campo: "activo", label: "Estado", tipo: "estado" },
  ];

  const getAccionesProveedor = (proveedor) => {
    const acciones = [];

    if (esBodega) {
      acciones.push({
        label: "Editar",
        onClick: () => {
          setProveedorSeleccionado(proveedor);
          setFormProveedor({
            nombre: proveedor.nombre,
            activo: proveedor.activo,
          });
          setModalProveedorAbierto(true);
        },
      });
    }

    if (esAdmin && proveedor.activo) {
      acciones.push({
        label: "Desactivar",
        onClick: () => {
          setProveedorSeleccionado(proveedor);
          setModalEliminarAbierto(true);
        },
      });
    }

    if (esAdmin && !proveedor.activo) {
      acciones.push({
        label: "Reactivar",
        onClick: async () => {
          try {
            await proveedoresService.actualizarProveedor(proveedor.id, {
              activo: true,
            });
            const proveedoresData = await proveedoresService.obtenerProveedores(filtros);
            setProveedores(proveedoresData);
            toast.success("Proveedor reactivado exitosamente", { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
          } catch (error) {
            console.error("Error reactivando proveedor:", error);
            toast.error("Error al reactivar el proveedor: " + error.message, { style: { borderRadius: "10px", background: "#333", color: "#fff" } });
          }
        },
      });
    }

    return acciones;
  };

  return (
    <div className="proveedores-page">
      <div className="page-header">
        <h1>Gestión de Proveedores</h1>
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

          {esBodega && (
            <button
              className="btn-primary"
              onClick={() => {
                setProveedorSeleccionado(null);
                setFormProveedor({
                  nombre: "",
                  activo: true,
                });
                setModalProveedorAbierto(true);
              }}
            >
              Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      <TablaGenerica
        columnas={columnasProveedores}
        datos={proveedores}
        filasPorPagina={10}
        mostrarBuscador={true}
        buscarEnCampos={["nombre"]}
        paginacion={true}
        renderAcciones={getAccionesProveedor}
      />

      <Modal
        isOpen={modalProveedorAbierto}
        onClose={() => setModalProveedorAbierto(false)}
        titulo={proveedorSeleccionado ? "Editar Proveedor" : "Nuevo Proveedor"}
        onConfirmar={handleGuardarProveedor}
        mostrarCancelar={true}
      >
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="nombre-input">Nombre:</label>
            <input
              id="nombre-input"
              type="text"
              name="nombre"
              value={formProveedor.nombre}
              onChange={handleCambioFormProveedor}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="activo-checkbox">Activo:</label>
            <input
              id="activo-checkbox"
              type="checkbox"
              name="activo"
              checked={formProveedor.activo}
              onChange={handleCambioFormProveedor}
              className="form-control"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={modalEliminarAbierto}
        onClose={() => setModalEliminarAbierto(false)}
        titulo="Desactivar Proveedor"
        onConfirmar={handleEliminarProveedor}
        mostrarCancelar={true}
      >
        <div className="modal-form">
          {proveedorSeleccionado && (
            <>
              <div className="form-group">
                <label>Proveedor:</label>
                <p className="proveedor-info">
                  <strong>{proveedorSeleccionado.nombre}</strong>
                </p>
              </div>

              <div className="form-group">
                <p>
                  ¿Está seguro de que desea desactivar este proveedor? Esta acción
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

export default ProveedoresPage;