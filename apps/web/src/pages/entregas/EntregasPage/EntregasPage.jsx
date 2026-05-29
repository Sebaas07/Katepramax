import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import entregaService from "@/services/entrega.service";
import Modal from "@/components/common/Modal/Modal";
import EstadoBadge from "@/components/common/EstadoBadge/EstadoBadge";
import { formatCOP, formatFechaHora } from "@/utils/formatters";
import "./EntregasPage.css";

const Spinner = () => (
  <div className="entr-spinner-wrap">
    <div className="entr-spinner" />
    <span>Cargando tus entregas...</span>
  </div>
);

// Normaliza "EnRuta" → "en_ruta" para EstadoBadge
const normalizarEstado = (estado) =>
  estado?.replace("EnRuta", "en_ruta").toLowerCase() ?? "";

const TarjetaEntrega = ({ asignacion, onSalida, onConfirmar, onFallo }) => {
  const estadoNorm = normalizarEstado(asignacion.estado);
  const pedido = asignacion.pedido;

  return (
    <div className={`entr-card entr-card--${estadoNorm}`}>
      <div className="entr-card-header">
        <div className="entr-card-id">
          <span className="material-symbols-outlined">shopping_bag</span>
          Pedido #{pedido?.id ?? asignacion.pedidoId}
        </div>
        <EstadoBadge estado={estadoNorm} />
      </div>

      <div className="entr-card-body">
        <div className="entr-info-row">
          <span className="material-symbols-outlined entr-icon">person</span>
          <span>{pedido?.cliente?.nombre ?? "—"}</span>
        </div>
        {pedido?.cliente?.telefono && (
          <div className="entr-info-row">
            <span className="material-symbols-outlined entr-icon">phone</span>
            <span>{pedido.cliente.telefono}</span>
          </div>
        )}
        <div className="entr-info-row">
          <span className="material-symbols-outlined entr-icon">schedule</span>
          <span>Asignado: {formatFechaHora(asignacion.asignadoEn)}</span>
        </div>

        {/* Productos */}
        {pedido?.detalles?.length > 0 && (
          <div className="entr-productos">
            <p className="entr-productos-titulo">Productos</p>
            <ul className="entr-productos-lista">
              {pedido.detalles.map((d, i) => (
                <li key={i}>
                  <span>{d.producto?.descripcion ?? d.productoId}</span>
                  <span className="entr-prod-cant">×{d.cantidad}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="entr-card-footer">
        {estadoNorm === "pendiente" && (
          <button
            className="entr-btn entr-btn--salida"
            onClick={() => onSalida(asignacion)}
            type="button"
          >
            <span className="material-symbols-outlined">directions_bike</span>
            Salí a entregar
          </button>
        )}

        {estadoNorm === "en_ruta" && (
          <>
            <button
              className="entr-btn entr-btn--confirmar"
              onClick={() => onConfirmar(asignacion)}
              type="button"
            >
              <span className="material-symbols-outlined">check_circle</span>
              Confirmar entrega
            </button>
            <button
              className="entr-btn entr-btn--fallo"
              onClick={() => onFallo(asignacion)}
              type="button"
            >
              <span className="material-symbols-outlined">cancel</span>
              Fallo
            </button>
          </>
        )}

        {estadoNorm === "entregado" && (
          <div className="entr-entregado-info">
            <span className="material-symbols-outlined">check_circle</span>
            {formatCOP(asignacion.montoCobrado)}
            {asignacion.metodoPago && (
              <span className="entr-metodo"> · {asignacion.metodoPago}</span>
            )}
          </div>
        )}

        {estadoNorm === "fallido" && (
          <div className="entr-fallido-info">
            <span className="material-symbols-outlined">cancel</span>
            Entrega fallida
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
  const { usuario } = useAuth();

  const [entregas,     setEntregas]     = useState([]);
  const [cargando,     setCargando]     = useState(false);
  const [guardando,    setGuardando]    = useState(false);
  const [filtroEstado, setFiltroEstado] = useState("");

  const [modalConfirmarAbierto, setModalConfirmarAbierto] = useState(false);
  const [modalFalloAbierto,     setModalFalloAbierto]     = useState(false);
  const [asignacionActiva,      setAsignacionActiva]      = useState(null);

  const [formConfirmar, setFormConfirmar] = useState({
    montoCobrado:  "",
    metodoPago:    "Efectivo",
    observaciones: "",
  });
  const [motivoFallo, setMotivoFallo] = useState("");

  // ── Carga ────────────────────────────────────────────────
  const cargarEntregas = useCallback(async () => {
    setCargando(true);
    try {
      // Filtro de estado al backend debe ser con mayúscula exacta del enum
      const filtros = {};
      if (filtroEstado) filtros.estado = filtroEstado;
      const data = await entregaService.obtenerMisEntregas(filtros);
      setEntregas(data);
    } catch (err) {
      toast.error("Error al cargar entregas: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [filtroEstado]);

  useEffect(() => { cargarEntregas(); }, [cargarEntregas]);

  // ── Salida ───────────────────────────────────────────────
  const handleSalida = async (asignacion) => {
    try {
      await entregaService.marcarSalida(asignacion.id);
      toast.success("¡Listo! Estás en ruta.");
      await cargarEntregas();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Confirmar ────────────────────────────────────────────
  const abrirConfirmar = (asignacion) => {
    setAsignacionActiva(asignacion);
    setFormConfirmar({ montoCobrado: "", metodoPago: "Efectivo", observaciones: "" });
    setModalConfirmarAbierto(true);
  };

  const handleConfirmar = async () => {
    setGuardando(true);
    try {
      await entregaService.confirmarEntrega(asignacionActiva.id, {
        montoCobrado:  formConfirmar.montoCobrado,
        metodoPago:    formConfirmar.metodoPago,
        observaciones: formConfirmar.observaciones,
      });
      toast.success("Entrega confirmada.");
      setModalConfirmarAbierto(false);
      await cargarEntregas();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Fallo ────────────────────────────────────────────────
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

  // ── Contadores ───────────────────────────────────────────
  const pendientes = entregas.filter((e) => e.estado === "Pendiente").length;
  const enRuta     = entregas.filter((e) => e.estado === "EnRuta").length;

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="entregas-page">
      <div className="page-header">
        <div>
          <h1>Mis Entregas</h1>
          <p className="entr-subtitulo">
            {usuario?.nombreCompleto ?? "Entregador"}
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

          {/* Filtro — estados con mayúscula exacta del backend */}
          <div className="filter-group">
            <label htmlFor="entr-filtro">Filtrar</label>
            <select
              id="entr-filtro"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="filter-select"
            >
              <option value="">Todos</option>
              <option value="Pendiente">Pendientes</option>
              <option value="EnRuta">En ruta</option>
              <option value="Entregado">Entregados</option>
              <option value="Fallido">Fallidos</option>
            </select>
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

      {/* Contenido */}
      {cargando ? (
        <Spinner />
      ) : entregas.length === 0 ? (
        <div className="entr-empty">
          <span className="material-symbols-outlined entr-empty-icon">local_shipping</span>
          <p>No tienes entregas{filtroEstado ? " con ese estado" : " asignadas"}.</p>
        </div>
      ) : (
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
      )}

      {/* Modal — Confirmar entrega (sin foto) */}
      <Modal
        isOpen={modalConfirmarAbierto}
        onClose={() => setModalConfirmarAbierto(false)}
        titulo="Confirmar Entrega"
        textoBotonConfirmar={guardando ? "Confirmando..." : "Confirmar"}
        onConfirmar={handleConfirmar}
        mostrarCancelar
      >
        <div className="modal-form">
          <div className="form-group">
            <label htmlFor="entr-monto">Monto cobrado (COP) *</label>
            <input
              id="entr-monto"
              type="number"
              value={formConfirmar.montoCobrado}
              onChange={(e) =>
                setFormConfirmar((p) => ({ ...p, montoCobrado: e.target.value }))
              }
              className="form-control"
              min="0"
              step="100"
              placeholder="0"
            />
          </div>

          <div className="form-group">
            <label htmlFor="entr-metodo">Método de pago *</label>
            <select
              id="entr-metodo"
              value={formConfirmar.metodoPago}
              onChange={(e) =>
                setFormConfirmar((p) => ({ ...p, metodoPago: e.target.value }))
              }
              className="form-control"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="entr-obs">Observaciones (opcional)</label>
            <textarea
              id="entr-obs"
              value={formConfirmar.observaciones}
              onChange={(e) =>
                setFormConfirmar((p) => ({ ...p, observaciones: e.target.value }))
              }
              className="form-control"
              rows={2}
              placeholder="Novedad de la entrega..."
            />
          </div>
        </div>
      </Modal>

      {/* Modal — Registrar fallo */}
      <Modal
        isOpen={modalFalloAbierto}
        onClose={() => setModalFalloAbierto(false)}
        titulo="Registrar Fallo"
        textoBotonConfirmar={guardando ? "Registrando..." : "Registrar fallo"}
        onConfirmar={handleFallo}
        mostrarCancelar
      >
        <div className="modal-form">
          <div className="entr-fallo-aviso">
            <span className="material-symbols-outlined">info</span>
            El pedido volverá a <strong>Pendiente</strong> para reasignación.
          </div>
          <div className="form-group">
            <label htmlFor="entr-motivo">Motivo del fallo *</label>
            <textarea
              id="entr-motivo"
              value={motivoFallo}
              onChange={(e) => setMotivoFallo(e.target.value)}
              className="form-control"
              rows={4}
              placeholder="Ej: Cliente ausente, dirección incorrecta..."
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EntregasPage;
