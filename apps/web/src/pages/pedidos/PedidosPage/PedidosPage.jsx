import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import pedidosService from "@/services/pedidos.service";
import inventarioService from "@/services/inventario.service";
import clientesService from "@/services/clientes.service";
import entregaService from "@/services/entrega.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import FacturaTicket from "@/components/common/FacturaTicket/FacturaTicket";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import "./PedidosPage.css";

const POLLING_INTERVAL_MS = 15000;

const Spinner = () => (
  <div className="ped-spinner-wrap">
    <div className="ped-spinner" />
    <span>Cargando pedidos...</span>
  </div>
);

// Contador simple para generar ids estables de ítems en el formulario.
// No son ids de base de datos (estos ítems aún no existen ahí); solo
// sirven para que React tenga una key estable que no dependa del índice
// del array, así un ítem no "salta" de identidad al agregar/quitar otros.
let contadorItemId = 0;
const crearItemVacio = () => ({
  id: `item-${++contadorItemId}`,
  productoId: "",
  cantidad: "",
  precioUnitario: "",
  busqueda: "",
});

const crearFormInicial = () => ({
  clienteId: "",
  direccion: "",
  observaciones: "",
  valorDomicilio: "",
  sedeId: "",
  items: [crearItemVacio()],
});

const normalizarEstado = (raw) => {
  if (!raw && raw !== 0) return null;
  if (typeof raw === "string" && /^[A-Za-z]/.test(raw)) return raw;
  const MAPA = {
    1: "Pendiente",
    2: "Asignado",
    3: "En ruta",
    4: "Entregado",
    5: "Fallido",
  };
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return MAPA[n] ?? String(raw);
};

const PedidosPage = () => {
  const { esAdmin, puedeGestionarPedidos, puedeAsignarEntregador, usuario, isAuthenticated, isSessionChecked } =
    useAuth();
  const puedeCrear = puedeGestionarPedidos;
  const puedeAsignar = puedeAsignarEntregador;
  const sedeIdUsuario = usuario?.sedeId ?? null;
  const esEntregador = usuario?.rol === "Entregador";

  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [entregadores, setEntregadores] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorDatos, setErrorDatos] = useState(null);

  const [tabActiva, setTabActiva] = useState("");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroSede, setFiltroSede] = useState("");

  const [modalPedidoAbierto, setModalPedidoAbierto] = useState(false);
  const [modalAsignarAbierto, setModalAsignarAbierto] = useState(false);
  const [modalFalloPedidoAbierto, setModalFalloPedidoAbierto] = useState(false);
  const [modalConfirmarPedidoAbierto, setModalConfirmarPedidoAbierto] =
    useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [asignacionAccion, setAsignacionAccion] = useState(null);
  const [motivoFalloPedido, setMotivoFalloPedido] = useState("");
  const [modalFacturaAbierto, setModalFacturaAbierto] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [cargandoFactura, setCargandoFactura] = useState(false);
  const [formConfirmarPedido, setFormConfirmarPedido] = useState({
    montoCobrado: "",
    metodoPago: "Efectivo",
    observaciones: "",
    fechaConfirmada: new Date().toISOString().slice(0, 16),
  });

  const [formPedido, setFormPedido] = useState(crearFormInicial);
  const [entregadorId, setEntregadorId] = useState("");
  const [dropdownProductoAbierto, setDropdownProductoAbierto] = useState(null);

  const mapaProductosPorCodigo = useMemo(
    () => Object.fromEntries(productos.map((p) => [String(p.codigo), p])),
    [productos],
  );
  const mapaClientesPorId = useMemo(
    () => Object.fromEntries(clientes.map((c) => [c.id, c])),
    [clientes],
  );
  const mapaEntregadoresPorId = useMemo(
    () => Object.fromEntries(entregadores.map((e) => [e.id, e])),
    [entregadores],
  );

  const sedesDisponibles = useMemo(() => {
    if (sedes.length > 0) return sedes.map((s) => s.id).sort((a, b) => a - b);
    const s = new Set();
    productos.forEach((p) => {
      const sid = p.sedeId ?? p.sede?.id;
      if (sid != null) s.add(sid);
    });
    return Array.from(s).sort((a, b) => a - b);
  }, [sedes, productos]);

  const nombreSede = useCallback(
    (sedeId) => {
      const id = typeof sedeId === "string" ? parseInt(sedeId, 10) : sedeId;
      if (!id) return "—";
      const sedeEncontrada = sedes.find((s) => s.id === id);
      if (sedeEncontrada?.nombre) return sedeEncontrada.nombre;
      const nombres = { 1: "Bogotá", 2: "Cartagena", 3: "Villavicencio" };
      return nombres[id] ?? `Sede ${id}`;
    },
    [sedes],
  );

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setErrorDatos(null);
    try {
      const [pedidosData, productosData, clientesData, sedesData] =
        await Promise.all([
          pedidosService.obtenerPedidos(),
          inventarioService.obtenerProductos({ activo: "true" }),
          clientesService.obtenerClientes({ activo: "true" }),
          puedeGestionarPedidos ? inventarioService.obtenerSedes() : Promise.resolve([]),
        ]);
      setPedidos(pedidosData);
      // Log para diagnóstico: mostrar las primeras entradas
      console.debug("pedidos cargados:", pedidosData?.slice?.(0, 5));
      setProductos(productosData);
      setClientes(clientesData);
      setSedes(Array.isArray(sedesData) ? sedesData : []);
      if (puedeAsignarEntregador) {
        setEntregadores(await pedidosService.obtenerEntregadores());
      } else {
        setEntregadores([]);
      }
    } catch (err) {
      setErrorDatos(
        "No fue posible cargar los pedidos. Revisa la conexión o credenciales.",
      );
      toast.error("Error al cargar datos: " + (err?.message || "desconocido"));
      setEntregadores([]);
      setSedes([]);
    } finally {
      setCargando(false);
    }
  }, [esAdmin, puedeGestionarPedidos, puedeAsignarEntregador]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();

    const intervalo = setInterval(cargarDatos, POLLING_INTERVAL_MS);
    return () => clearInterval(intervalo);
  }, [cargarDatos, isSessionChecked, isAuthenticated]);

  const pedidosNormalizados = useMemo(
    () =>
      pedidos.map((p) => {
        const estado = normalizarEstado(p.estado);
        let clienteId = p.clienteId ?? p.cliente?.id ?? null;
        const clienteObj = clienteId ? mapaClientesPorId[clienteId] : null;

        let sedeFinal = p.sedeId ?? p.sede?.id ?? null;
        if (!sedeFinal && clienteObj?.sedeId) sedeFinal = clienteObj.sedeId;
        const sedeNombreDirecta = p.sede?.nombre ?? p.sedeNombre ?? null;
        if (!sedeFinal) {
          const it = p.items?.[0] ?? p.detalles?.[0];
          if (it) {
            const cod = String(
              it.productoId ?? it.producto?.codigo ?? it.productoCodigo ?? "",
            );
            const prod = mapaProductosPorCodigo[cod];
            sedeFinal = prod?.sedeId ?? prod?.sede?.id ?? null;
          }
        }

        const nombreEntregador = p.asignaciones?.length
          ? (p.asignaciones[0].entregador?.nombreCompleto ??
            p.asignaciones[0].entregador?.nombre ??
            (typeof p.asignaciones[0].entregadorId === "number"
              ? (mapaEntregadoresPorId[p.asignaciones[0].entregadorId]
                  ?.nombreCompleto ?? "—")
              : "—"))
          : "Sin asignar";

        const totalPedido = (p.items ?? p.detalles ?? []).reduce((acc, it) => {
          const cant = parseInt(it.cantidad ?? 0, 10);
          const precio = parseFloat(
            it.precioUnitario ?? it.precio_unitario ?? 0,
          );
          return (
            acc +
            (Number.isNaN(cant) ? 0 : cant) *
              (Number.isNaN(precio) ? 0 : precio)
          );
        }, 0);

        return {
          ...p,
          estado,
          cliente:
            clienteObj?.nombre ??
            p.cliente?.nombre ??
            `Cliente #${clienteId ?? "—"}`,
          sedeId: sedeFinal,
          sedeNombre: sedeNombreDirecta ?? nombreSede(sedeFinal),
          entregador: nombreEntregador,
          totalPedido,
          direccion: p.direccion ?? "",
        };
      }),
    [
      pedidos,
      mapaClientesPorId,
      mapaEntregadoresPorId,
      mapaProductosPorCodigo,
      nombreSede,
    ],
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
    { campo: "id", label: "ID", tipo: "texto" },
    { campo: "cliente", label: "Cliente", tipo: "texto" },
    { campo: "direccion", label: "Dirección", tipo: "texto" },
    { campo: "sedeNombre", label: "Sede", tipo: "texto" },
    { campo: "totalPedido", label: "Total ($)", tipo: "moneda" },
    { campo: "estado", label: "Estado", tipo: "estado" },
    { campo: "creadoEn", label: "Fecha", tipo: "fecha" },
    { campo: "entregador", label: "Asignado a", tipo: "texto" },
  ];

  const handleCambioFormPedido = (e) => {
    const { name, value } = e.target;
    setFormPedido((prev) => ({ ...prev, [name]: value }));
  };

  const handleCambioItem = (index, campo, valor) => {
    setFormPedido((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [campo]: valor } : item,
      ),
    }));
  };

  const handleSeleccionProducto = (index, productoId) => {
    const prod = productos.find((p) => String(p.codigo) === String(productoId));
    setFormPedido((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              productoId,
              busqueda: prod ? `[${prod.codigo}] ${prod.nombre ?? prod.descripcion}` : "",
              precioUnitario: prod
                ? String(prod.precioVenta ?? prod.precioDetal ?? "")
                : "",
            }
          : item,
      ),
    }));
    setDropdownProductoAbierto(null);
  };

  // El texto de búsqueda es independiente del producto confirmado: escribir
  // (o borrar) nunca queda "trabado" — solo se confirma un producto nuevo al
  // elegirlo de la lista. Si el campo queda vacío, se limpia el producto.
  const handleBuscarProducto = (index, texto) => {
    setFormPedido((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? { ...item, busqueda: texto, productoId: "", precioUnitario: "" }
          : item,
      ),
    }));
    setDropdownProductoAbierto(index);
  };

  const handleLimpiarProducto = (index) => {
    setFormPedido((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, productoId: "", busqueda: "", precioUnitario: "" } : item,
      ),
    }));
    setDropdownProductoAbierto(null);
  };

  const handleAgregarItem = () => {
    setFormPedido((prev) => ({
      ...prev,
      items: [...prev.items, crearItemVacio()],
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
    setFormPedido({
      ...crearFormInicial(),
      sedeId: esAdmin ? "" : String(sedeIdUsuario ?? ""),
    });
    setModalPedidoAbierto(true);
  };

  const handleGuardarPedido = async () => {
    setGuardando(true);
    try {
      const itemsValidos = formPedido.items.filter(
        (item) => item.productoId && parseInt(item.cantidad) >= 1,
      );
      await pedidosService.crearPedido({
        clienteId: formPedido.clienteId,
        sedeId: esAdmin
          ? formPedido.sedeId
            ? parseInt(formPedido.sedeId, 10)
            : undefined
          : (sedeIdUsuario ?? undefined),
        direccion: formPedido.direccion,
        observaciones: formPedido.observaciones,
        valorDomicilio: formPedido.valorDomicilio
          ? parseFloat(formPedido.valorDomicilio)
          : undefined,
        items: itemsValidos,
      });
      toast.success("Pedido creado correctamente.");
      setModalPedidoAbierto(false);
      await cargarDatos();
    } catch (err) {
      const serverMsg =
        err?.response?.data?.error || err?.message || "Error desconocido";
      console.error("pedidosService.crearPedido:", err?.response?.data || err);

      // Manejo especial para falta de stock: mostrar una alerta amigable
      if (String(serverMsg).toLowerCase().includes("stock insuficiente")) {
        toast(
          "No hay stock suficiente para uno o más productos. Ve a Inventario para registrar entrada.",
          { icon: "⚠️" },
        );
      } else {
        toast.error(serverMsg);
      }
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
      await pedidosService.asignarEntregador(
        pedidoSeleccionado.id,
        entregadorId,
      );
      toast.success("Entregador asignado correctamente.");
      setModalAsignarAbierto(false);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const obtenerAsignacionId = (pedido) => {
    const asig = pedido.asignaciones?.[0];
    return asig?.id ?? null;
  };

  const handleMarcarEnRutaPedido = async (pedido) => {
    const asigId = obtenerAsignacionId(pedido);
    if (!asigId) {
      toast.error("Esta entrega no tiene asignación.");
      return;
    }
    try {
      await entregaService.marcarSalida(asigId);
      toast.success("¡Listo! Estás en ruta.");
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const abrirConfirmarEntregaPedido = (pedido) => {
    const asigId = obtenerAsignacionId(pedido);
    if (!asigId) {
      toast.error("Esta entrega no tiene asignación.");
      return;
    }
    setAsignacionAccion(asigId);
    setFormConfirmarPedido({
      montoCobrado: "",
      metodoPago: "Efectivo",
      observaciones: "",
      fechaConfirmada: new Date().toISOString().slice(0, 16),
    });
    setModalConfirmarPedidoAbierto(true);
  };

  const handleConfirmarEntregaPedido = async () => {
    setGuardando(true);
    try {
      await entregaService.confirmarEntrega(asignacionAccion, {
        montoCobrado: formConfirmarPedido.montoCobrado,
        metodoPago: formConfirmarPedido.metodoPago,
        observaciones: formConfirmarPedido.observaciones,
        fechaConfirmada: formConfirmarPedido.fechaConfirmada,
      });
      toast.success("Entrega confirmada correctamente.");
      setModalConfirmarPedidoAbierto(false);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const abrirFalloPedido = (pedido) => {
    const asigId = obtenerAsignacionId(pedido);
    if (!asigId) {
      toast.error("Esta entrega no tiene asignación.");
      return;
    }
    setAsignacionAccion(asigId);
    setMotivoFalloPedido("");
    setModalFalloPedidoAbierto(true);
  };

  const handleFalloPedido = async () => {
    setGuardando(true);
    try {
      await entregaService.registrarFallo(asignacionAccion, motivoFalloPedido);
      toast.success("Fallo registrado. El pedido vuelve a Pendiente.");
      setModalFalloPedidoAbierto(false);
      await cargarDatos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const abrirFactura = async (pedido) => {
    setCargandoFactura(true);
    setFacturaSeleccionada(null);
    setModalFacturaAbierto(true);
    try {
      const factura = await pedidosService.obtenerFactura(pedido.id);
      setFacturaSeleccionada(factura);
    } catch (err) {
      toast.error("No se pudo cargar la factura: " + err.message);
      setModalFacturaAbierto(false);
    } finally {
      setCargandoFactura(false);
    }
  };

  const acciones = (pedido) => {
    const accs = [];

    if (esEntregador) {
      const asigId = obtenerAsignacionId(pedido);
      if (pedido.estado === "Pendiente" || pedido.estado === "Asignado") {
        if (asigId) {
          accs.push({
            label: "En Ruta",
            icon: "directions_bike",
            onClick: () => handleMarcarEnRutaPedido(pedido),
            variante: "success",
          });
        }
        if (asigId) {
          accs.push({
            label: "Fallido",
            icon: "cancel",
            onClick: () => abrirFalloPedido(pedido),
            variante: "danger",
          });
        }
      } else if (pedido.estado === "EnRuta") {
        if (asigId) {
          accs.push({
            label: "Entregado",
            icon: "check_circle",
            onClick: () => abrirConfirmarEntregaPedido(pedido),
            variante: "success",
          });
        }
        if (asigId) {
          accs.push({
            label: "Fallido",
            icon: "cancel",
            onClick: () => abrirFalloPedido(pedido),
            variante: "danger",
          });
        }
      }
    }

    if (
      puedeAsignar &&
      (pedido.estado === "Pendiente" || pedido.estado === "Asignado")
    ) {
      accs.push({
        label: "Asignar",
        icon: "delivery_dining",
        onClick: () => abrirAsignar(pedido),
      });
    }

    accs.push({
      label: "Factura",
      icon: "receipt_long",
      onClick: () => abrirFactura(pedido),
    });

    return accs;
  };

  return (
    <div className="pedidos-page">
      <div className="page-header">
        <div>
          <h1>Gestión de Pedidos</h1>
          <p className="ped-subtitulo">
            Administra pedidos, asignaciones y entregas
          </p>
        </div>

        <div className="ped-header-acciones">
          <div className="ped-tabs">
            {[
              { key: "", label: "Todos" },
              { key: "Pendiente", label: "Pendientes" },
              { key: "Asignado", label: "Asignados" },
              { key: "En ruta", label: "En Ruta" },
              { key: "Entregado", label: "Entregados" },
              { key: "Fallido", label: "Fallidos" },
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
                  <option key={sid} value={String(sid)}>
                    {nombreSede(sid)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {puedeCrear && (
            <button
              className="btn-primary"
              onClick={abrirModalNuevo}
              type="button"
            >
              <span className="material-symbols-outlined">
                add_shopping_cart
              </span>
              Nuevo Pedido
            </button>
          )}
        </div>
      </div>

      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : errorDatos ? (
          <EmptyState
            icon="cloud_off"
            title="Error de conexión"
            description={errorDatos}
            actionLabel="Reintentar"
            onAction={cargarDatos}
          />
        ) : pedidosFiltrados.length === 0 ? (
          <EmptyState
            icon="shopping_bag"
            title="Sin pedidos"
            description={
              tabActiva
                ? `No hay pedidos ${tabActiva.toLowerCase()}s`
                : "No hay pedidos registrados"
            }
            subDescription="Los pedidos aparecerán aquí cuando se creen."
          />
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
            <label htmlFor="ped-direccion">Dirección de entrega</label>
            <input
              id="ped-direccion"
              type="text"
              name="direccion"
              value={formPedido.direccion}
              onChange={handleCambioFormPedido}
              className="form-control"
              placeholder="Calle, número, barrio, referencia..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="ped-valor-domicilio">Valor a pagar al entregador</label>
            <input
              id="ped-valor-domicilio"
              type="number"
              name="valorDomicilio"
              min="0"
              step="0.01"
              value={formPedido.valorDomicilio}
              onChange={handleCambioFormPedido}
              className="form-control"
              placeholder="0"
            />
            <span className="form-hint">
              Lo que se pagará al entregador por este despacho.
            </span>
          </div>

          {esAdmin && (
            <div className="form-group">
              <label htmlFor="ped-sede-modal">Sede *</label>
              <select
                id="ped-sede-modal"
                name="sedeId"
                value={formPedido.sedeId}
                onChange={handleCambioFormPedido}
                className="form-control"
                required
              >
                <option value="">— Selecciona una sede —</option>
                {sedesDisponibles.map((sid) => (
                  <option key={sid} value={String(sid)}>
                    {nombreSede(sid)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="productos-label" id="productos-label">
              Productos *
            </label>

            <div
              className="ped-items"
              role="list"
              aria-labelledby="productos-label"
            >
              {formPedido.items.map((item, index) => {
                const prodSel = productos.find(
                  (p) => String(p.codigo) === String(item.productoId),
                );
                const precioBase = prodSel
                  ? Number(prodSel.precioVenta ?? prodSel.precioDetal ?? 0)
                  : 0;
                const cantidadNum = parseInt(item.cantidad, 10) || 0;
                const precioNum =
                  item.precioUnitario !== ""
                    ? parseFloat(item.precioUnitario) || 0
                    : precioBase;
                const subtotal = cantidadNum * precioNum;

                const terminoBusqueda = (item.busqueda || "").trim().toLowerCase();
                const productosFiltrados = (
                  terminoBusqueda
                    ? productos.filter(
                        (p) =>
                          String(p.codigo).includes(terminoBusqueda) ||
                          String(p.nombre ?? p.descripcion ?? "")
                            .toLowerCase()
                            .includes(terminoBusqueda),
                      )
                    : productos
                ).slice(0, 8);

                return (
                  <div key={item.id} className="item-group" role="listitem">
                    <div className="item-group-header">
                      <h4>Ítem {index + 1}</h4>
                      {formPedido.items.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => handleEliminarItem(index)}
                          aria-label={`Eliminar ítem ${index + 1}`}
                        >
                          <span
                            className="material-symbols-outlined"
                            aria-hidden="true"
                          >
                            close
                          </span>
                        </button>
                      )}
                    </div>

                    <div className="item-fields">
                      <div className="item-field--producto ped-combobox">
                        <label htmlFor={`ped-buscar-${index}`}>Producto</label>
                        <div className="ped-combobox__input-wrap">
                          <input
                            id={`ped-buscar-${index}`}
                            type="text"
                            className="form-control"
                            placeholder="Busca por código o nombre..."
                            autoComplete="off"
                            value={item.busqueda}
                            onFocus={() => setDropdownProductoAbierto(index)}
                            onChange={(e) => handleBuscarProducto(index, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setDropdownProductoAbierto(null);
                            }}
                            onBlur={() => {
                              // pequeño margen para que el click en una opción
                              // se registre antes de cerrar el dropdown
                              window.setTimeout(() => {
                                setDropdownProductoAbierto((cur) =>
                                  cur === index ? null : cur,
                                );
                              }, 150);
                            }}
                          />
                          {item.busqueda && (
                            <button
                              type="button"
                              className="ped-combobox__clear"
                              aria-label="Quitar producto seleccionado"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleLimpiarProducto(index)}
                            >
                              <span className="material-symbols-outlined" aria-hidden="true">
                                close
                              </span>
                            </button>
                          )}
                        </div>

                        {dropdownProductoAbierto === index && (
                          <div className="ped-combobox__dropdown">
                            {productosFiltrados.length === 0 ? (
                              <div className="ped-combobox__vacio">
                                Sin resultados para “{item.busqueda}”
                              </div>
                            ) : (
                              productosFiltrados.map((p) => (
                                <button
                                  type="button"
                                  key={p.codigo}
                                  className="ped-combobox__opcion"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleSeleccionProducto(index, p.codigo)}
                                >
                                  <span className="ped-combobox__opcion-nombre">
                                    [{p.codigo}] {p.nombre ?? p.descripcion}
                                  </span>
                                  <span className="ped-combobox__opcion-sede">
                                    {p.sede?.nombre ?? nombreSede(p.sedeId)}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div className="item-field--cantidad">
                        <label htmlFor={`ped-cant-${index}`}>Cant.</label>
                        <input
                          id={`ped-cant-${index}`}
                          type="number"
                          value={item.cantidad}
                          onChange={(e) =>
                            handleCambioItem(index, "cantidad", e.target.value)
                          }
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
                            {prodSel
                              ? `(sugerido $${precioBase.toLocaleString("es-CO")})`
                              : "(opcional)"}
                          </span>
                        </label>
                        <input
                          id={`ped-precio-${index}`}
                          type="number"
                          value={item.precioUnitario}
                          onChange={(e) =>
                            handleCambioItem(
                              index,
                              "precioUnitario",
                              e.target.value,
                            )
                          }
                          className="form-control"
                          min="0"
                          step="100"
                          placeholder="Auto"
                        />
                      </div>

                      <div className="item-field--subtotal">
                        <span className="item-label">Subtotal</span>
                        <span className="item-subtotal">
                          $
                          {subtotal.toLocaleString("es-CO", {
                            minimumFractionDigits: 0,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="btn-add-item"
              onClick={handleAgregarItem}
              aria-label="Agregar nuevo producto al pedido"
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
              Agregar producto
            </button>
          </div>

          {formPedido.items.some((it) => it.productoId && it.cantidad) && (
            <div className="ped-resumen">
              <span>Total estimado:</span>
              <strong>
                $
                {formPedido.items
                  .reduce((acc, it) => {
                    const prod = productos.find(
                      (p) => String(p.codigo) === String(it.productoId),
                    );
                    const precioBase = prod
                      ? Number(prod.precioVenta ?? prod.precioDetal ?? 0)
                      : 0;
                    const cantidadNum = parseInt(it.cantidad, 10) || 0;
                    const precioNum =
                      it.precioUnitario !== ""
                        ? parseFloat(it.precioUnitario) || 0
                        : precioBase;
                    return acc + cantidadNum * precioNum;
                  }, 0)
                  .toLocaleString("es-CO", { minimumFractionDigits: 0 })}
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
                  <span className="pedido-info__dir">
                    {" "}
                    — {pedidoSeleccionado.direccion}
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
                  {e.sede?.nombre ? ` — ${e.sede.nombre}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal — Confirmar entrega (Entregador) */}
      <Modal
        isOpen={modalConfirmarPedidoAbierto}
        onClose={() => setModalConfirmarPedidoAbierto(false)}
        titulo="Confirmar Entrega"
        textoBotonConfirmar={guardando ? "Confirmando..." : "Confirmar"}
        onConfirmar={handleConfirmarEntregaPedido}
        mostrarCancelar
        disabled={guardando}
      >
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="ped-fecha-confirmar">
              Fecha y Hora Confirmada *
            </label>
            <DatePicker
              id="ped-fecha-confirmar"
              enableTime
              value={formConfirmarPedido.fechaConfirmada}
              onChange={(e) =>
                setFormConfirmarPedido((p) => ({
                  ...p,
                  fechaConfirmada: e.target.value,
                }))
              }
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ped-monto-confirmar">Monto Cobrado ($) *</label>
            <input
              id="ped-monto-confirmar"
              type="number"
              value={formConfirmarPedido.montoCobrado}
              onChange={(e) =>
                setFormConfirmarPedido((p) => ({
                  ...p,
                  montoCobrado: e.target.value,
                }))
              }
              className="form-control"
              min="0"
              step="100"
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ped-metodo-confirmar">Forma de Pago *</label>
            <select
              id="ped-metodo-confirmar"
              value={formConfirmarPedido.metodoPago}
              onChange={(e) =>
                setFormConfirmarPedido((p) => ({
                  ...p,
                  metodoPago: e.target.value,
                }))
              }
              className="form-control"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="ped-obs-confirmar">Nota (opcional)</label>
            <textarea
              id="ped-obs-confirmar"
              value={formConfirmarPedido.observaciones}
              onChange={(e) =>
                setFormConfirmarPedido((p) => ({
                  ...p,
                  observaciones: e.target.value,
                }))
              }
              className="form-control"
              rows={2}
              placeholder="Observaciones de la entrega..."
            />
          </div>
        </div>
      </Modal>

      {/* Modal — Registrar fallo (Entregador) */}
      <Modal
        isOpen={modalFalloPedidoAbierto}
        onClose={() => setModalFalloPedidoAbierto(false)}
        titulo="Registrar Fallo"
        textoBotonConfirmar={guardando ? "Registrando..." : "Registrar"}
        onConfirmar={handleFalloPedido}
        mostrarCancelar
        disabled={guardando}
      >
        <div className="modal-form">
          <div className="entr-fallo-aviso">
            <span className="material-symbols-outlined">info</span>
            El pedido volverá a <strong>Pendiente</strong> para reasignación.
          </div>
          <div className="form-group">
            <label htmlFor="ped-motivo-fallo">Nota del fallo *</label>
            <textarea
              id="ped-motivo-fallo"
              value={motivoFalloPedido}
              onChange={(e) => setMotivoFalloPedido(e.target.value)}
              className="form-control"
              rows={3}
              placeholder="Ej: Cliente ausente, dirección incorrecta, no contesta..."
              required
            />
          </div>
        </div>
      </Modal>

      {/* Modal — Factura (imprimir ticket POS con QR) */}
      <Modal
        isOpen={modalFacturaAbierto}
        onClose={() => setModalFacturaAbierto(false)}
        titulo="Factura de venta"
        textoBotonConfirmar="Imprimir factura"
        onConfirmar={() => window.print()}
        mostrarCancelar
        disabled={!facturaSeleccionada}
        maxWidth="420px"
      >
        {/* Vista previa dentro del modal (solo pantalla) */}
        <div className="ped-factura-preview" aria-hidden="true">
          {cargandoFactura ? (
            <div className="ped-factura-carga">Cargando factura...</div>
          ) : facturaSeleccionada ? (
            <FacturaTicket factura={facturaSeleccionada} />
          ) : null}
        </div>
      </Modal>

      {/*
       * El ticket que realmente se imprime vive en un portal fuera del
       * modal: `.modal-content` tiene overflow:hidden + max-height:90vh,
       * y eso recorta cualquier descendiente con position:absolute
       * (incluida .factura-print-area), causando facturas "en blanco"
       * al imprimir. Montarlo directo en document.body evita el recorte.
       */}
      {modalFacturaAbierto &&
        createPortal(
          <div className="factura-print-area">
            {cargandoFactura ? (
              <div className="ped-factura-carga">Cargando factura...</div>
            ) : facturaSeleccionada ? (
              <FacturaTicket factura={facturaSeleccionada} />
            ) : null}
          </div>,
          document.body
        )}
    </div>
  );
};

export default PedidosPage;
