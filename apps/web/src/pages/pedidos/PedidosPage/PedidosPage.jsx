import { useState, useEffect, useCallback, useMemo } from "react";
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

const normalizarEstado = (raw) => {
  if (!raw && raw !== 0) return null;
  if (typeof raw === "string" && /^[A-Za-z]/.test(raw)) return raw;
  const MAPA = { 1: "Pendiente", 2: "Asignado", 3: "En ruta", 4: "Entregado", 5: "Fallido" };
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return MAPA[n] ?? String(raw);
};

const PedidosPage = () => {
  const { esAdmin, esBodega, isAuthenticated, isSessionChecked } = useAuth();
  const puedeCrear    = esAdmin || esBodega;
  const puedeAsignar  = esAdmin || esBodega;
  const puedeCancelar = esAdmin;

  const [pedidos,      setPedidos]      = useState([]);
  const [productos,    setProductos]    = useState([]);
  const [clientes,     setClientes]     = useState([]);
  const [entregadores, setEntregadores] = useState([]);
  const [cargando,     setCargando]     = useState(false);
  const [guardando,    setGuardando]    = useState(false);
  const [errorDatos,   setErrorDatos]   = useState(null);

  const [tabActiva,    setTabActiva]    = useState("");
  const [filtroTexto,  setFiltroTexto]  = useState("");
  const [filtroSede,   setFiltroSede]   = useState("");

  const [modalPedidoAbierto,    setModalPedidoAbierto]    = useState(false);
  const [modalAsignarAbierto,   setModalAsignarAbierto]   = useState(false);
  const [modalCancelarAbierto,  setModalCancelarAbierto]  = useState(false);
  const [pedidoSeleccionado,    setPedidoSeleccionado]    = useState(null);

  const [formPedido,     setFormPedido]     = useState(FORM_INICIAL);
  const [entregadorId,   setEntregadorId]   = useState("");

  const mapaProductosPorCodigo = useMemo(
    () => Object.fromEntries(productos.map((p) => [String(p.codigo), p])),
    [productos]
  );
  const mapaClientesPorId = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c])),
    [clientes]
  );
  const mapaEntregadoresPorId = useMemo(
    () => Object.fromEntries(entregadores.map((e) => [e.id, e])),
    [entregadores]
  );

  const sedesDisponibles = useMemo(() => {
    const s = new Set();
    productos.forEach((p) => {
      const sid = p.sedeId ?? p.sede?.id;
      if (sid != null) s.add(sid);
    });
    return Array.from(s).sort();
  }, [productos]);

  const nombreSede = (sedeId) => {
    const id = typeof sedeId === "string" ? parseInt(sedeId, 10) : sedeId;
    if (!id) return "—";
    const nombres = { 1: "Bogotá", 2: "Cartagena", 3: "Villavicencio" };
    const primero = productos.find((p) => {
      const sid = p.sedeId ?? p.sede?.id;
      return sid === id;
    });
    return nombres[id] ?? primero?.sede?.nombre ?? `Sede ${id}`;
  };

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setErrorDatos(null);
    try {
      const [pedidosData, productosData, clientesData] =
        await Promise.all([
          pedidosService.obtenerPedidos(),
          inventarioService.obtenerProductos({ activo: "true" }),
          clientesService.obtenerClientes({ activo: "true" }),
        ]);
      setPedidos(pedidosData);
      setProductos(productosData);
      setClientes(clientesData);
      if (esAdmin) {
        setEntregadores(await pedidosService.obtenerEntregadores());
      } else {
        setEntregadores([]);
      }
    } catch (err) {
      setErrorDatos("No fue posible cargar los pedidos. Revisa la conexión o credenciales.");
      toast.error("Error al cargar datos: " + (err?.message || "desconocido"));
      setEntregadores([]);
    } finally {
      setCargando(false);
    }
  }, [esAdmin]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    cargarDatos();
  }, [cargarDatos, isSessionChecked, isAuthenticated]);

  const pedidosNormalizados = useMemo(
    () =>
      pedidos.map((p) => {
        const estado = normalizarEstado(p.estado);
        let clienteId = p.clienteId ?? p.cliente?.id ?? null;
        const clienteObj = clienteId ? mapaClientesPorId[clienteId] : null;

        let sedeFinal = p.sedeId ?? p.sede?.id ?? null;
        if (!sedeFinal && clienteObj?.sedeId) sedeFinal = clienteObj.sedeId;
        if (!sedeFinal) {
          const it = p.items?.[0] ?? p.detalles?.[0];
          if (it) {
            const cod = String(it.productoId ?? it.producto?.codigo ?? it.productoCodigo ?? "");
            const prod = mapaProductosPorCodigo[cod];
            sedeFinal = prod?.sedeId ?? prod?.sede?.id ?? null;
          }
        }

        const nombreEntregador = p.asignaciones?.length
          ? (p.asignaciones[0].entregador?.nombreCompleto ??
            p.asignaciones[0].entregador?.nombre ??
            (typeof p.asignaciones[0].entregadorId === "number"
              ? (mapaEntregadoresPorId[p.asignaciones[0].entregadorId]?.nombreCompleto ?? "—")
              : "—"))
          : "Sin asignar";

        const totalPedido = (p.items ?? p.detalles ?? []).reduce((acc, it) => {
          const cant = parseInt(it.cantidad ?? 0, 10);
          const precio = parseFloat(it.precioUnitario ?? it.precio_unitario ?? 0);
          return acc + (Number.isNaN(cant) ? 0 : cant) * (Number.isNaN(precio) ? 0 : precio);
        }, 0);

        return {
          ...p,
          estado,
          cliente: clienteObj?.nombre ?? p.cliente?.nombre ?? `Cliente #${clienteId ?? "—"}`,
          sedeId: sedeFinal,
          sedeNombre: nombreSede(sedeFinal),
          entregador: nombreEntregador,
          totalPedido,
          direccion: p.observaciones ?? "",
        };
      }),
    [pedidos, mapaClientesPorId, mapaEntregadoresPorId, mapaProductosPorCodigo, productos, clientes, entregadores]
  );

  const pedidosFiltrados = useMemo(() => {
    let data = pedidosNormalizados;
    if (tabActiva) data = data.filter((p) => p.estado === tabActiva);
    if (filtroSede) {
      const sid = parseInt(filtroSede, 10);
      data = data.filter((p) => p.sedeId === sid);
    }
    if (filtroTexto.trim()) {
      const termino = filtroTexto.toLowerCase().trim();
      data = data.filter((p) => {
        const texto = [
          p.id ?? "",
          p.cliente,
          p.direccion,
          p.sedeNombre,
          p.entregador,
          p.estado,
          p.creadoEn ? new Date(p.creadoEn).toLocaleDateString("es-CO") : "",
        ]
          .join(" ")
          .toLowerCase();
        return texto.includes(termino);
      });
    }
    return data;
  }, [pedidosNormalizados, tabActiva, filtroSede, filtroTexto]);

  const columnas = [
    { campo: "id",          label: "ID",         tipo: "texto"  },
    { campo: "cliente",     label: "Cliente",    tipo: "texto"  },
    { campo: "direccion",   label: "Dirección",  tipo: "texto"  },
    { campo: "sedeNombre",  label: "Sede",       tipo: "texto"  },
    { campo: "totalPedido", label: "Total ($)",  tipo: "moneda" },
    { campo: "estado",      label: "Estado",     tipo: "estado" },
    { campo: "creadoEn",    label: "Fecha",      tipo: "fecha"  },
    { campo: "entregador",  label: "Asignado a", tipo: "texto"  },
  ];

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

  const handleSeleccionProducto = (index, productoId) => {
    const prod = productos.find((p) => String(p.codigo) === String(productoId));
    setFormPedido((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? { ...item, productoId, precioUnitario: prod ? String(prod.precioVenta ?? prod.precioDetal ?? "") : "" }
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

  const abrirModalNuevo = () => {
    setFormPedido(FORM_INICIAL);
    setModalPedidoAbierto(true);
  };

  const handleGuardarPedido = async () => {
    setGuardando(true);
    try {
      const itemsValidos = formPedido.items.filter((item) => item.productoId && parseInt(item.cantidad) >= 1);
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

  const acciones = (pedido) => {
    if (puedeAsignar && pedido.estado === "Pendiente") {
      return [
        {
          label: "Asignar",
          icon: "delivery_dining",
          onClick: () => abrirAsignar(pedido),
        },
      ];
    }
    return [];
  };

  return (
    <div className="pedidos-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Pedidos</h1>
          <p className="ped-subtitulo">Administra pedidos, asignaciones y entregas</p>
        </div>

        <div className="ped-header-acciones">
          <div className="ped-tabs">
            {[
              { key: "",         label: "Todos" },
              { key: "Pendiente", label: "Pendientes" },
              { key: "Asignado",  label: "Asignados" },
              { key: "En ruta",   label: "En Ruta" },
              { key: "Entregado", label: "Entregados" },
              { key: "Fallido",   label: "Fallidos" },
            ].map((t) => (
              <button
                key={t.key}
                className={tabActiva === t.key ? "ped-tab--active" : "ped-tab"}
                onClick={() => setTabActiva(t.key)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>

          {!errorDatos && (
            <div className="filter-group">
              <label htmlFor="ped-sede">Sede</label>
              <select
                id="ped-sede"
                value={filtroSede}
                onChange={(e) => setFiltroSede(e.target.value)}
                className="filter-select"
              >
                <option value="">Todas</option>
                {sedesDisponibles.map((sid) => (
                  <option key={sid} value={String(sid)}>{nombreSede(sid)}</option>
                ))}
              </select>
            </div>
          )}

          {puedeCrear && (
            <button className="btn-primary" onClick={abrirModalNuevo} type="button">
              <span className="material-symbols-outlined">add_shopping_cart</span>
              Nuevo Pedido
            </button>
          )}
        </div>
      </div>

      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : errorDatos ? (
          <div className="ped-error">
            <span className="material-symbols-outlined">cloud_off</span>
            <p>{errorDatos}</p>
            <button className="btn-outline" onClick={cargarDatos}>Reintentar</button>
          </div>
        ) : (
          <div className="ped-tabla-wrap">
            <div className="ped-search">
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Buscar por ID, cliente, dirección o entregador..."
                value={filtroTexto}
                onChange={(e) => setFiltroTexto(e.target.value)}
                className="ped-search-input"
              />
            </div>
            <TablaGenerica
              columnas={columnas}
              datos={pedidosFiltrados}
              filasPorPagina={10}
              mostrarBuscador={false}
              paginacion
              renderAcciones={acciones}
            />
          </div>
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

          <div className="form-group">
            <label htmlFor="ped-obs">Dirección de entrega</label>
            <input
              id="ped-obs"
              type="text"
              name="observaciones"
              value={formPedido.observaciones}
              onChange={handleCambioFormPedido}
              className="form-control"
              placeholder="Calle, número, barrio, referencia..."
            />
          </div>

          <div className="form-group">
            <label>Productos *</label>
            <div className="ped-items">
              {formPedido.items.map((item, index) => {
                const prodSel = productos.find((p) => String(p.codigo) === String(item.productoId));
                const precioBase = prodSel ? (prodSel.precioVenta ?? prodSel.precioDetal ?? 0) : 0;
                const cantidad = parseInt(item.cantidad, 10);
                const subtotal =
                  (Number.isNaN(cantidad) ? 0 : cantidad) *
                  (parseFloat(item.precioUnitario || String(precioBase)) || 0);

                return (
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
                        <label htmlFor={`ped-buscar-${index}`}>Producto</label>
                        <input
                          id={`ped-buscar-${index}`}
                          type="text"
                          list={`ped-buscar-dl-${index}`}
                          className="form-control"
                          placeholder="Busca por código o nombre..."
                          value={
                            prodSel
                              ? `[${prodSel.codigo}] ${prodSel.nombre ?? prodSel.descripcion}`
                              : ""
                          }
                          onChange={(e) => {
                            const raw = e.target.value;
                            const match = raw.match(/\[(\d+)\]/);
                            if (match) handleSeleccionProducto(index, match[1]);
                          }}
                        />
                        <datalist id={`ped-buscar-dl-${index}`}>
                          {productos.map((p) => (
                            <option key={p.codigo} value={`[${p.codigo}] ${p.nombre ?? p.descripcion}`}>
                              {p.sede?.nombre ?? nombreSede(p.sedeId)}
                            </option>
                          ))}
                        </datalist>
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
                          <span className="item-precio-hint">
                            {prodSel ? `(sugerido $${precioBase.toLocaleString("es-CO")})` : "(opcional)"}
                          </span>
                        </label>
                        <input
                          id={`ped-precio-${index}`}
                          type="number"
                          value={item.precioUnitario}
                          onChange={(e) => handleCambioItem(index, "precioUnitario", e.target.value)}
                          className="form-control"
                          min="0"
                          step="100"
                          placeholder="Auto"
                        />
                      </div>

                      <div className="item-field--subtotal">
                        <label>Subtotal</label>
                        <span className="item-subtotal">
                          ${subtotal.toLocaleString("es-CO", { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button type="button" className="btn-add-item" onClick={handleAgregarItem}>
              <span className="material-symbols-outlined">add</span>
              Agregar producto
            </button>
          </div>

          {formPedido.items.some((it) => it.productoId && it.cantidad) && (
            <div className="ped-resumen">
              <span>Total estimado:</span>
              <strong>
                ${formPedido.items.reduce((acc, it) => {
                  const prod = productos.find((p) => String(p.codigo) === String(it.productoId));
                  const precio = prod ? (prod.precioVenta ?? prod.precioDetal ?? 0) : 0;
                  const cant = parseInt(it.cantidad, 10);
                  return acc + (Number.isNaN(cant) ? 0 : cant) * (parseFloat(it.precioUnitario || String(precio)) || 0);
                }, 0).toLocaleString("es-CO", { minimumFractionDigits: 0 })}
              </strong>
            </div>
          )}
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
                {pedidoSeleccionado.cliente}
                {pedidoSeleccionado.direccion && (
                  <span className="pedido-info__dir"> — {pedidoSeleccionado.direccion}</span>
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
    </div>
  );
};

export default PedidosPage;
