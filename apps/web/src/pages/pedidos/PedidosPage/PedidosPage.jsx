import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import pedidosService from "@/services/pedidos.service";
import inventarioService from "@/services/inventario.service";
import clientesService from "@/services/clientes.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./PedidosPage.css";

const Spinner = () => (
  <div className="ped-spinner-wrap">
    <div className="ped-spinner" />
    <span>Cargando pedidos...</span>
  </div>
);

const ITEM_VACIO = { productoId: "", cantidad: "", precioUnitario: "" };

const FORM_INICIAL = {
  clienteId:    "",
  observaciones: "",
  items:        [{ ...ITEM_VACIO }],
};

const PedidosPage = () => {
  const { esAdmin, esBodega } = useAuth();
  const puedeCrear   = esAdmin || esBodega;
  const puedeAsignar = esAdmin || esBodega;
  const puedeCancelar = esAdmin;

  // ── Estado ────────────────────────────────────────────────
  const [pedidos,      setPedidos]      = useState([]);
  const [productos,    setProductos]    = useState([]);
  const [clientes,     setClientes]     = useState([]);
  const [entregadores, setEntregadores] = useState([]);
  const [cargando,     setCargando]     = useState(false);
  const [guardando,    setGuardando]    = useState(false);

  // Estados con mayúscula inicial — igual que el backend
  const [filtros, setFiltros] = useState({ estado: "" });

  const [modalPedidoAbierto,  setModalPedidoAbierto]  = useState(false);
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState(false);
  const [pedidoSeleccionado,  setPedidoSeleccionado]  = useState(null);

  const [formPedido,  setFormPedido]  = useState(FORM_INICIAL);
  const [entregadorId, setEntregadorId] = useState("");

  // ── Carga ─────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [pedidosData, productosData, clientesData] =
        await Promise.all([
          pedidosService.obtenerPedidos(filtros),
          inventarioService.obtenerProductos({ activo: "true" }),
          clientesService.obtenerClientes({ activo: "true" }),
        ]);
      setPedidos(pedidosData);
      setProductos(productosData);
      setClientes(clientesData);
      // Solo Admin puede ver lista de usuarios
      if (esAdmin) {
        const entregadoresData = await pedidosService.obtenerEntregadores();
        setEntregadores(entregadoresData);
      } else {
        setEntregadores([]);
      }
    } catch (err) {
      toast.error("Error al cargar datos: " + err.message);
      setEntregadores([]);
    } finally {
      setCargando(false);
    }
  }, [filtros, esAdmin]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ── Handlers form pedido ──────────────────────────────────
  const handleCambioFormPedido = (e) => {
    const { name, value } = e.target;
    setFormPedido((prev) => ({ ...prev, [name]: value }));
  };

  const handleCambioItem = (index, campo, valor) => {
    setFormPedido((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [campo]: valor } : item
      ),
    }));
  };

  // Al seleccionar producto — autocompletar precio de venta
  const handleSeleccionProducto = (index, productoId) => {
    const prod = productos.find((p) => p.codigo === productoId);
    setFormPedido((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              productoId,
              precioUnitario: prod ? String(prod.precioVenta ?? "") : "",
            }
          : item
      ),
    }));
  };

  const handleAgregarItem = () => {
    setFormPedido((prev) => ({
      ...prev,
      items: [...prev.items, { ...ITEM_VACIO }],
    }));
  };

  const handleEliminarItem = (index) => {
    if (formPedido.items.length <= 1) return;
    setFormPedido((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // ── Crear pedido ──────────────────────────────────────────
  const abrirModalNuevo = () => {
    setFormPedido(FORM_INICIAL);
    setModalPedidoAbierto(true);
  };

  const handleGuardarPedido = async () => {
    setGuardando(true);
    try {
      const itemsValidos = formPedido.items.filter(
        (item) => item.productoId && parseInt(item.cantidad) >= 1
      );
      await pedidosService.crearPedido({
        clienteId:    formPedido.clienteId,
        observaciones: formPedido.observaciones,
        items:        itemsValidos,
      });
      toast.success("Pedido creado correctamente.");
      setModalPedidoAbierto(false);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Asignar entregador ────────────────────────────────────
  const abrirAsignar = (pedido) => {
    setPedidoSeleccionado(pedido);
    setEntregadorId("");
    setModalAsignarAbierto(true);
  };

  const handleAsignar = async () => {
    if (!entregadorId) {
      toast("Selecciona un entregador.", { icon: "⚠️" });
      return;
    }
    setGuardando(true);
    try {
      await pedidosService.asignarEntregador(pedidoSeleccionado.id, entregadorId);
      toast.success("Entregador asignado.");
      setModalAsignarAbierto(false);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Cancelar pedido (solo Admin) ──────────────────────────
  const abrirCancelar = (pedido) => {
    setPedidoSeleccionado(pedido);
    setModalCancelarAbierto(true);
  };

  const handleCancelar = async () => {
    setGuardando(true);
    try {
      await pedidosService.cancelarPedido(pedidoSeleccionado.id);
      toast.success("Pedido cancelado.");
      setModalCancelarAbierto(false);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Columnas ──────────────────────────────────────────────
  const columnas = [
    { campo: "id",            label: "#",          tipo: "texto"  },
    { campo: "cliente",       label: "Cliente",    tipo: "texto"  },
    { campo: "estado",        label: "Estado",     tipo: "estado" },
    { campo: "entregador",    label: "Entregador", tipo: "texto"  },
    { campo: "totalRecibido", label: "Total",      tipo: "moneda" },
    { campo: "creadoEn",      label: "Fecha",      tipo: "fecha"  },
  ];

  // Mapear campos anidados para la tabla
  const pedidosMapeados = pedidos.map((p) => ({
    ...p,
    cliente:    p.cliente?.nombre ?? "—",
    entregador: p.asignaciones?.[0]?.entregador?.nombreCompleto ?? "Sin asignar",
  }));

  const acciones = (pedido) => {
    const lista = [];
    if (puedeAsignar && pedido.estado === "Pendiente") {
      lista.push({
        label: "Asignar",
        icon: "delivery_dining",
        onClick: () => abrirAsignar(pedido),
      });
    }
    if (puedeCancelar && ["Pendiente", "Asignado"].includes(pedido.estado)) {
      lista.push({
        label: "Cancelar",
        icon: "cancel",
        variante: "danger",
        onClick: () => abrirCancelar(pedido),
      });
    }
    return lista;
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="pedidos-page">
      {/* Header */}
      <div className="page-header">
        <h1>Gestión de Pedidos</h1>

        <div className="ped-header-acciones">
          {/* Filtro estado — mayúscula inicial igual que el backend */}
          <div className="filter-group">
            <label htmlFor="ped-estado">Estado</label>
            <select
              id="ped-estado"
              value={filtros.estado}
              onChange={(e) => setFiltros({ estado: e.target.value })}
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="Pendiente">Pendiente</option>
              <option value="Asignado">Asignado</option>
              <option value="Entregado">Entregado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {puedeCrear && (
            <button className="btn-primary" onClick={abrirModalNuevo} type="button">
              <span className="material-symbols-outlined">add_shopping_cart</span>
              Nuevo pedido
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
            datos={pedidosMapeados}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["cliente", "entregador"]}
            paginacion
            renderAcciones={acciones}
          />
        )}
      </div>

      {/* Modal — Nuevo pedido */}
      <Modal
        isOpen={modalPedidoAbierto}
        onClose={() => setModalPedidoAbierto(false)}
        titulo="Nuevo Pedido"
        textoBotonConfirmar={guardando ? "Creando..." : "Crear pedido"}
        onConfirmar={handleGuardarPedido}
        mostrarCancelar
      >
        <div className="modal-form">
          {/* Cliente — select con clientes reales */}
          <div className="form-group">
            <label htmlFor="ped-cliente">Cliente *</label>
            <select
              id="ped-cliente"
              name="clienteId"
              value={formPedido.clienteId}
              onChange={handleCambioFormPedido}
              className="form-control"
            >
              <option value="">— Selecciona un cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                  {c.telefono ? ` · ${c.telefono}` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Observaciones / dirección */}
          <div className="form-group">
            <label htmlFor="ped-obs">Dirección / Observaciones</label>
            <input
              id="ped-obs"
              type="text"
              name="observaciones"
              value={formPedido.observaciones}
              onChange={handleCambioFormPedido}
              className="form-control"
              placeholder="Dirección de entrega u observaciones"
            />
          </div>

          {/* Items */}
          <div className="form-group">
            <label>Productos *</label>
            {formPedido.items.map((item, index) => (
              <div key={index} className="item-group">
                <div className="item-group-header">
                  <h4>Ítem {index + 1}</h4>
                  {formPedido.items.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove-item"
                      onClick={() => handleEliminarItem(index)}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  )}
                </div>
                <div className="item-fields">
                  <div className="item-field--producto">
                    <label htmlFor={`ped-prod-${index}`}>Producto</label>
                    <select
                      id={`ped-prod-${index}`}
                      value={item.productoId}
                      onChange={(e) => handleSeleccionProducto(index, e.target.value)}
                      className="form-control"
                    >
                      <option value="">— Selecciona —</option>
                      {productos.map((p) => (
                        <option key={p.codigo} value={p.codigo}>
                          [{p.codigo}] {p.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="item-field--cantidad">
                    <label htmlFor={`ped-cant-${index}`}>Cant.</label>
                    <input
                      id={`ped-cant-${index}`}
                      type="number"
                      value={item.cantidad}
                      onChange={(e) => handleCambioItem(index, "cantidad", e.target.value)}
                      className="form-control"
                      min="1"
                      step="1"
                      placeholder="0"
                    />
                  </div>
                  <div className="item-field--precio">
                    <label htmlFor={`ped-precio-${index}`}>
                      Precio unit.{" "}
                      <span className="item-precio-hint">(opcional)</span>
                    </label>
                    <input
                      id={`ped-precio-${index}`}
                      type="number"
                      value={item.precioUnitario}
                      onChange={(e) =>
                        handleCambioItem(index, "precioUnitario", e.target.value)
                      }
                      className="form-control"
                      min="0"
                      step="100"
                      placeholder="Auto"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className="btn-add-item" onClick={handleAgregarItem}>
              <span className="material-symbols-outlined">add</span>
              Agregar producto
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal — Asignar entregador */}
      <Modal
        isOpen={modalAsignarAbierto}
        onClose={() => setModalAsignarAbierto(false)}
        titulo="Asignar Entregador"
        textoBotonConfirmar={guardando ? "Asignando..." : "Asignar"}
        onConfirmar={handleAsignar}
        mostrarCancelar
      >
        <div className="modal-form">
          {pedidoSeleccionado && (
            <div className="form-group">
              <label>Pedido #{pedidoSeleccionado.id}</label>
              <p className="pedido-info">
                {pedidoSeleccionado.cliente?.nombre ?? pedidoSeleccionado.cliente}
                {pedidoSeleccionado.observaciones && (
                  <span className="pedido-info__dir">
                    {" "}— {pedidoSeleccionado.observaciones}
                  </span>
                )}
              </p>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="ped-entregador">Entregador *</label>
            <select
              id="ped-entregador"
              value={entregadorId}
              onChange={(e) => setEntregadorId(e.target.value)}
              className="form-control"
            >
              <option value="">— Selecciona un entregador —</option>
              {entregadores.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombreCompleto}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal — Confirmar cancelar */}
      <Modal
        isOpen={modalCancelarAbierto}
        onClose={() => setModalCancelarAbierto(false)}
        titulo="Cancelar Pedido"
        textoBotonConfirmar={guardando ? "Cancelando..." : "Sí, cancelar"}
        onConfirmar={handleCancelar}
        mostrarCancelar
      >
        <div className="ped-confirm-body">
          <span className="material-symbols-outlined ped-confirm-icon">warning</span>
          <p>
            ¿Cancelar el pedido{" "}
            <strong>#{pedidoSeleccionado?.id}</strong> de{" "}
            <strong>{pedidoSeleccionado?.cliente?.nombre}</strong>?
          </p>
          <p className="ped-confirm-sub">Esta acción no se puede deshacer.</p>
        </div>
      </Modal>
    </div>
  );
};

export default PedidosPage;