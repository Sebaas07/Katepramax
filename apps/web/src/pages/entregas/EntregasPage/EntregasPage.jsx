import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import entregaService from "@/services/entrega.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import EstadoBadge from "@/components/common/EstadoBadge/EstadoBadge";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import { formatCOP, formatFecha } from "@/utils/formatters";
import "./EntregasPage.css";

const POLLING_INTERVAL_MS = 20000;

const Spinner = () => (
  <div className="entr-spinner-wrap">
    <div className="entr-spinner" />
    <span>Cargando tus entregas...</span>
  </div>
);

const TarjetaEntrega = ({ asignacion, onSalida, onConfirmar, onFallo }) => {
   const estado = asignacion.estado;
   const pedido = asignacion.pedido;
   const estadoNormalizado = estado === "EnRuta" ? "en_ruta" : estado?.toLowerCase();

   const totalPedido = useMemo(() => {
    const items = pedido?.detalles ?? pedido?.items ?? [];
    return items.reduce((acc, it) => {
      const cant = parseInt(it.cantidad ?? 0, 10);
      const precio = parseFloat(it.precioUnitario ?? it.precio_unitario ?? it.precio ?? 0);
      return acc + (Number.isNaN(cant) ? 0 : cant) * (Number.isNaN(precio) ? 0 : precio);
    }, 0);
  }, [pedido]);

  const resumenProductos = useMemo(() => {
    const items = pedido?.detalles ?? pedido?.items ?? [];
    return items.slice(0, 3).map((it) => it.producto?.descripcion ?? it.producto?.nombre ?? `#${it.productoId}`).join(", ");
  }, [pedido]);

  const nombreSede = (sedeId) => {
    const nombres = { 1: "Bogotá", 2: "Cartagena", 3: "Villavicencio" };
    return nombres[sedeId] ?? `Sede ${sedeId ?? "—"}`;
  };

  return (
    <div className={`entr-card entr-card--${estadoNormalizado}`}>
      <div className="entr-card-header">
        <div className="entr-card-id">
          <span className="material-symbols-outlined">shopping_bag</span>
          Pedido #{pedido?.id ?? asignacion.pedidoId}
        </div>
        <EstadoBadge estado={estadoNormalizado} />
      </div>

      <div className="entr-card-body">
        <div className="entr-info-row">
          <span className="material-symbols-outlined entr-icon">person</span>
          <span>{pedido?.cliente?.nombre ?? "—"}</span>
        </div>

        <div className="entr-info-row">
          <span className="material-symbols-outlined entr-icon">location_on</span>
          <span>{pedido?.observaciones ?? "—"}</span>
        </div>

        <div className="entr-info-row">
          <span className="material-symbols-outlined entr-icon">store</span>
          <span>{nombreSede(pedido?.sedeId ?? pedido?.sede?.id)}</span>
        </div>

        {resumenProductos && (
          <div className="entr-info-row">
            <span className="material-symbols-outlined entr-icon">inventory</span>
            <span className="entr-productos-resumen">{resumenProductos}</span>
          </div>
        )}

        <div className="entr-info-row">
          <span className="material-symbols-outlined entr-icon">attach_money</span>
          <strong className="entr-total">{formatCOP(totalPedido)}</strong>
        </div>

        {pedido?.creadoEn && (
          <div className="entr-info-row">
            <span className="material-symbols-outlined entr-icon">schedule</span>
            <span>{formatFecha(pedido.creadoEn)}</span>
          </div>
        )}
      </div>

      <div className="entr-card-footer">
        {estado === "Pendiente" && (
          <button
            className="entr-btn entr-btn--salida"
            onClick={() => onSalida(asignacion)}
            type="button"
          >
            <span className="material-symbols-outlined">directions_bike</span>
            Salí
          </button>
        )}

        {estado === "EnRuta" && (
          <>
            <button
              className="entr-btn entr-btn--confirmar"
              onClick={() => onConfirmar(asignacion)}
              type="button"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Entregado
            </button>
            <button
              className="entr-btn entr-btn--fallo"
              onClick={() => onFallo(asignacion)}
              type="button"
            >
              <span className="material-symbols-outlined">cancel</span>
              Fallido
            </button>
          </>
        )}

        {estado === "Entregado" && (
          <div className="entr-entregado-info">
            <span className="material-symbols-outlined">check_circle</span>
            <span>{formatCOP(asignacion.montoCobrado)}</span>
            {asignacion.metodoPago && (
              <span className="entr-metodo"> · {asignacion.metodoPago}</span>
            )}
          </div>
        )}

        {estado === "Fallido" && (
          <div className="entr-fallido-info">
            <span className="material-symbols-outlined">cancel</span>
            <span>Entrega fallida</span>
            {asignacion.observacionesEntrega && (
              <span className="entr-obs"> — {asignacion.observacionesEntrega}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const EntregasPage = () => {
  const { usuario, isAuthenticated, isSessionChecked } = useAuth();

  const [entregas, setEntregas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorDatos, setErrorDatos] = useState(null);

  const [modalConfirmarAbierto, setModalConfirmarAbierto] = useState(false);
  const [modalFalloAbierto, setModalFalloAbierto] = useState(false);
  const [asignacionActiva, setAsignacionActiva] = useState(null);

  const [formConfirmar, setFormConfirmar] = useState({
    montoCobrado: "",
    metodoPago: "Efectivo",
    observaciones: "",
  });
  const [motivoFallo, setMotivoFallo] = useState("");

  // Detectar ancho de pantalla para responsive
  const [anchoPantalla, setAnchoPantalla] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setAnchoPantalla(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const usarTarjetas = anchoPantalla < 768;

  // ── Carga de datos ───────────────────────────────────────────────
  const cargarEntregas = useCallback(async () => {
    setCargando(true);
    setErrorDatos(null);
    try {
      const data = await entregaService.obtenerMisEntregas();
      setEntregas(data);
    } catch (err) {
      setErrorDatos("No se pudieron cargar las entregas. Verifica tu conexión.");
      toast.error("Error al cargar entregas: " + err.message);
    } finally {
      setCargando(false);
    }
  }, []);

useEffect(() => {
      if (!isSessionChecked || !isAuthenticated) return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      cargarEntregas();

      const intervalo = setInterval(cargarEntregas, POLLING_INTERVAL_MS);
      return () => clearInterval(intervalo);
    }, [cargarEntregas, isSessionChecked, isAuthenticated]);

  // ── Handlers de acciones ───────────────────────────────────────────
  const handleSalida = async (asignacion) => {
    try {
      await entregaService.marcarSalida(asignacion.id);
      toast.success("¡Listo! Estás en ruta.");
      await cargarEntregas();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const abrirConfirmar = (asignacion) => {
    setAsignacionActiva(asignacion);
    setFormConfirmar({ montoCobrado: "", metodoPago: "Efectivo", observaciones: "" });
    setModalConfirmarAbierto(true);
  };

  const handleConfirmar = async () => {
    setGuardando(true);
    try {
      await entregaService.confirmarEntrega(asignacionActiva.id, {
        montoCobrado: formConfirmar.montoCobrado,
        metodoPago: formConfirmar.metodoPago,
        observaciones: formConfirmar.observaciones,
      });
      toast.success("Entrega confirmada correctamente.");
      setModalConfirmarAbierto(false);
      await cargarEntregas();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const abrirFallo = (asignacion) => {
    setAsignacionActiva(asignacion);
    setMotivoFallo("");
    setModalFalloAbierto(true);
  };

  const handleFallo = async () => {
    setGuardando(true);
    try {
      await entregaService.registrarFallo(asignacionActiva.id, motivoFallo);
      toast.success("Fallo registrado. El pedido vuelve a Pendiente.");
      setModalFalloAbierto(false);
      await cargarEntregas();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Columnas para tabla ──────────────────────────────────────────
  const columnas = [
    { campo: "id", label: "ID", tipo: "texto" },
    { campo: "cliente", label: "Cliente", tipo: "texto" },
    { campo: "direccion", label: "Dirección", tipo: "texto" },
    { campo: "sede", label: "Sede", tipo: "texto" },
    { campo: "total", label: "Total ($)", tipo: "moneda" },
    { campo: "estado", label: "Estado", tipo: "estado" },
  ];

  // Mapear datos para tabla
  const entregasMapeadas = useMemo(() => {
    return entregas.map((asig) => {
      const pedido = asig.pedido ?? {};
      const items = pedido.detalles ?? pedido.items ?? [];
      const total = items.reduce((acc, it) => {
        const cant = parseInt(it.cantidad ?? 0, 10);
        const precio = parseFloat(it.precioUnitario ?? it.precio_unitario ?? it.precio ?? 0);
        return acc + (Number.isNaN(cant) ? 0 : cant) * (Number.isNaN(precio) ? 0 : precio);
      }, 0);

      return {
        id: `#${pedido.id ?? asig.pedidoId ?? ""}`,
        cliente: pedido.cliente?.nombre ?? `Cliente #${pedido.clienteId ?? "—"}`,
        direccion: pedido.observaciones ?? "—",
        sede: { 1: "Bogotá", 2: "Cartagena", 3: "Villavicencio" }[pedido.sedeId] ?? `Sede ${pedido.sedeId ?? "—"}`,
        total,
        estado: asig.estado === "EnRuta" ? "en_ruta" : asig.estado?.toLowerCase(),
      };
    });
  }, [entregas]);

  // Contadores
  const pendientes = entregas.filter((e) => e.estado === "Pendiente").length;
  const enRuta = entregas.filter((e) => e.estado === "EnRuta").length;

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="entregas-page">
      <div className="page-header">
        <div>
          <h1>Mis Entregas</h1>
          <p className="entr-subtitulo">
            {usuario?.nombreCompleto ?? "Entregador"} — Rol: {usuario?.rol}
          </p>
        </div>

        <div className="entr-header-acciones">
          <div className="entr-kpis">
            <div className="entr-kpi">
              <span className="entr-kpi-valor">{pendientes}</span>
              <span className="entr-kpi-label">Pendientes</span>
            </div>
            <div className="entr-kpi entr-kpi--ruta">
              <span className="entr-kpi-valor">{enRuta}</span>
              <span className="entr-kpi-label">En ruta</span>
            </div>
          </div>

          <button
            className="btn-outline"
            onClick={cargarEntregas}
            disabled={cargando}
            type="button"
          >
            <span className="material-symbols-outlined">refresh</span>
            Actualizar
          </button>
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
             onAction={cargarEntregas}
           />
         ) : entregas.length === 0 ? (
           <EmptyState
             icon="local_shipping"
             title="Sin entregas"
             description="No tienes entregas asignadas."
             subDescription="Cuando se asignen pedidos, aparecerán aquí."
           />
         ) : usarTarjetas ? (
           <div className="entr-grid">
             {entregas.map((asignacion) => (
               <TarjetaEntrega
                 key={asignacion.id}
                 asignacion={asignacion}
                 onSalida={handleSalida}
                 onConfirmar={abrirConfirmar}
                 onFallo={abrirFallo}
               />
             ))}
           </div>
         ) : (
           <TablaGenerica
             columnas={columnas}
             datos={entregasMapeadas}
             filasPorPagina={10}
             mostrarBuscador={false}
             paginacion
           />
         )}
      </div>

      {/* Modal — Confirmar entrega */}
      <Modal
        isOpen={modalConfirmarAbierto}
        onClose={() => setModalConfirmarAbierto(false)}
        titulo="Confirmar Entrega"
        textoBotonConfirmar={guardando ? "Confirmando..." : "Confirmar"}
        onConfirmar={handleConfirmar}
        mostrarCancelar
        disabled={guardando}
      >
        <div className="modal-form">
{asignacionActiva && (
             <div className="form-group">
               <label>Pedido #{asignacionActiva.pedido?.id ?? asignacionActiva.pedidoId}</label>
               <p className="entr-pedido-info">
                 {asignacionActiva.pedido?.cliente?.nombre ?? "—"}
                 {asignacionActiva.pedido?.observaciones && (
                   <span className="entr-pedido-dir"> — {asignacionActiva.pedido.observaciones}</span>
                 )}
               </p>
               {asignacionActiva.pedido && (
                 <p className="entr-pedido-total">
                   Total del pedido: <strong>{formatCOP(
                     (asignacionActiva.pedido.detalles ?? asignacionActiva.pedido.items ?? []).reduce(
                       (acc, it) => acc + (parseInt(it.cantidad ?? 0, 10) * parseFloat(it.precioUnitario ?? 0)), 0
                     )
                   )}</strong>
                 </p>
               )}
             </div>
           )}

          <div className="form-group">
            <label htmlFor="entr-monto">Monto Cobrado ($) *</label>
            <input
              id="entr-monto"
              type="number"
              value={formConfirmar.montoCobrado}
              onChange={(e) => setFormConfirmar((p) => ({ ...p, montoCobrado: e.target.value }))}
              className="form-control"
              min="0"
              step="100"
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="entr-metodo">Forma de Pago *</label>
            <select
              id="entr-metodo"
              value={formConfirmar.metodoPago}
              onChange={(e) => setFormConfirmar((p) => ({ ...p, metodoPago: e.target.value }))}
              className="form-control"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="entr-obs">Nota (opcional)</label>
            <textarea
              id="entr-obs"
              value={formConfirmar.observaciones}
              onChange={(e) => setFormConfirmar((p) => ({ ...p, observaciones: e.target.value }))}
              className="form-control"
              rows={2}
              placeholder="Observaciones de la entrega..."
            />
          </div>
        </div>
      </Modal>

      {/* Modal — Registrar fallo */}
      <Modal
        isOpen={modalFalloAbierto}
        onClose={() => setModalFalloAbierto(false)}
        titulo="Registrar Fallo"
        textoBotonConfirmar={guardando ? "Registrando..." : "Registrar"}
        onConfirmar={handleFallo}
        mostrarCancelar
        disabled={guardando}
      >
        <div className="modal-form">
          {asignacionActiva && (
            <div className="form-group">
              <label>Pedido #{asignacionActiva.pedido?.id ?? asignacionActiva.pedidoId}</label>
              <p className="entr-pedido-info">
                {asignacionActiva.pedido?.cliente?.nombre ?? "—"}
              </p>
            </div>
          )}

          <div className="entr-fallo-aviso">
            <span className="material-symbols-outlined">info</span>
            El pedido volverá a <strong>Pendiente</strong> para reasignación.
          </div>

          <div className="form-group">
            <label htmlFor="entr-motivo">Nota del fallo *</label>
            <textarea
              id="entr-motivo"
              value={motivoFallo}
              onChange={(e) => setMotivoFallo(e.target.value)}
              className="form-control"
              rows={3}
              placeholder="Ej: Cliente ausente, dirección incorrecta, no contesta..."
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EntregasPage;