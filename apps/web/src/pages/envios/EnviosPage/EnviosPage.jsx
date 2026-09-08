import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import envioService from "@/services/envio.service";
import inventarioService from "@/services/inventario.service";
import Modal from "@/components/common/Modal/Modal";
import EnviosListado from "./EnviosListado";
import "./EnviosPage.css";

const lineaVacia = () => ({
  _id: `linea-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productoId: "",
  cantidad: "",
});

const EnviosPage = () => {
  const { usuario, esAdmin, esBodega, isAuthenticated, isSessionChecked } =
    useAuth();
  const puedeCrear = esAdmin || esBodega;

  // Sede operativa: para Bodega (oficina) es la bodega padre; para el resto, sedeId
  const sedeOperativaId =
    Number(usuario?.bodegaId ?? usuario?.sedeId ?? 0) || null;

  // Admin general arranca en "todos"; el resto en "recibidos"
  const [tab, setTab] = useState(esAdmin ? "todos" : "recibidos");
  const [envios, setEnvios] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [formNuevo, setFormNuevo] = useState({
    sedeOrigenId: "",
    sedesDestinoIds: [],
    detalles: [lineaVacia()],
    observaciones: "",
  });

  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [envioActivo, setEnvioActivo] = useState(null);
  const [formConfirmar, setFormConfirmar] = useState({
    detalles: [],
    observacionRecepcion: "",
  });

  const [modalCancelar, setModalCancelar] = useState(false);
  const [envioCancelar, setEnvioCancelar] = useState(null);

  // ── Carga de catálogos ────────────────────────────────────
  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    inventarioService
      .obtenerSedes()
      .then((d) => setSedes(Array.isArray(d) ? d : []))
      .catch(() => setSedes([]));
    inventarioService
      .obtenerProductos()
      .then((d) => setProductos(Array.isArray(d) ? d : []))
      .catch(() => setProductos([]));
  }, [isSessionChecked, isAuthenticated]);

  // ── Carga de envíos ────────────────────────────────────────
  const cargarEnvios = useCallback(async () => {
    setCargando(true);
    try {
      const filtros = {};
      if (tab === "todos") {
        // sin direccion → backend devuelve todos (solo Admin)
      } else {
        filtros.direccion = tab;
      }
      const data = await envioService.obtenerEnvios(filtros);
      setEnvios(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Error al cargar envíos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, [tab]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => {
      void cargarEnvios();
    }, 0);
    return () => window.clearTimeout(id);
  }, [cargarEnvios, isSessionChecked, isAuthenticated]);

  const mapaSedes = useMemo(
    () => Object.fromEntries(sedes.map((s) => [s.id, s.nombre])),
    [sedes],
  );

  // Los envíos entre sedes solo operan entre bodegas
  const bodegas = useMemo(
    () => sedes.filter((s) => s.tipo === "Bodega"),
    [sedes],
  );
  const sedesDestinoSeleccionadas = useMemo(
    () => new Set(formNuevo.sedesDestinoIds),
    [formNuevo.sedesDestinoIds],
  );

  // ── Modal: nuevo envío ─────────────────────────────────────
  const abrirNuevo = () => {
    setFormNuevo({
      sedeOrigenId: esBodega
        ? String(sedeOperativaId ?? usuario?.sedeId ?? "")
        : "",
      sedesDestinoIds: [],
      detalles: [lineaVacia()],
      observaciones: "",
    });
    setModalNuevo(true);
  };

  const toggleSedeDestino = (id) => {
    setFormNuevo((p) => ({
      ...p,
      sedesDestinoIds: p.sedesDestinoIds.includes(id)
        ? p.sedesDestinoIds.filter((s) => s !== id)
        : [...p.sedesDestinoIds, id],
    }));
  };

  const handleCambioLinea = (idx, campo, valor) => {
    setFormNuevo((p) => ({
      ...p,
      detalles: p.detalles.map((d, i) =>
        i === idx ? { ...d, [campo]: valor } : d,
      ),
    }));
  };

  const agregarLinea = () => {
    setFormNuevo((p) => ({ ...p, detalles: [...p.detalles, lineaVacia()] }));
  };

  const quitarLinea = (idx) => {
    setFormNuevo((p) => ({
      ...p,
      detalles: p.detalles.filter((_, i) => i !== idx),
    }));
  };

  const handleGuardarEnvio = async () => {
    setGuardando(true);
    try {
      await envioService.crearEnvio({
        sedeOrigenId: formNuevo.sedeOrigenId || undefined,
        sedesDestinoIds: formNuevo.sedesDestinoIds,
        detalles: formNuevo.detalles.flatMap((d) =>
          d.productoId && d.cantidad
            ? [{ productoId: d.productoId, cantidad: d.cantidad }]
            : [],
        ),
        observaciones: formNuevo.observaciones,
      });
      toast.success(
        "Envío creado. La(s) sede(s) destino ya lo pueden ver como pendiente.",
      );
      setModalNuevo(false);
      if (tab === "enviados") await cargarEnvios();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Modal: confirmar recepción ─────────────────────────────
  const abrirConfirmar = (envio) => {
    setEnvioActivo(envio);
    setFormConfirmar({
      detalles: envio.detalles.map((d) => ({
        envioDetalleId: d.id,
        productoId: d.productoId,
        producto: d.producto?.descripcion ?? `Producto ${d.productoId}`,
        cantidadEnviada: d.cantidadEnviada,
        cantidadRecibida: String(d.cantidadEnviada),
        observacion: "",
      })),
      observacionRecepcion: "",
    });
    setModalConfirmar(true);
  };

  const handleCambioDetalleConfirmar = (idx, campo, valor) => {
    setFormConfirmar((p) => ({
      ...p,
      detalles: p.detalles.map((d, i) =>
        i === idx ? { ...d, [campo]: valor } : d,
      ),
    }));
  };

  const handleConfirmarRecepcion = async () => {
    setGuardando(true);
    try {
      await envioService.confirmarEnvio(envioActivo.id, {
        detalles: formConfirmar.detalles,
        observacionRecepcion: formConfirmar.observacionRecepcion,
      });
      toast.success("Recepción confirmada. El inventario ya se actualizó.");
      setModalConfirmar(false);
      await cargarEnvios();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const datosTabla = envios.map((e) => ({
    ...e,
    sedeOrigenNombre:
      e.sedeOrigen?.nombre ??
      mapaSedes[e.sedeOrigenId] ??
      `Sede ${e.sedeOrigenId}`,
    sedeDestinoNombre:
      e.sedeDestino?.nombre ??
      mapaSedes[e.sedeDestinoId] ??
      `Sede ${e.sedeDestinoId}`,
    productosResumen: `${e.detalles?.length ?? 0} producto(s)`,
    creadorNombre: e.creador?.nombreCompleto ?? "—",
  }));

  // Compara contra la sede operativa (bodega), no la oficina del usuario
  const puedeConfirmar = (envio) =>
    envio.estado === "Pendiente" &&
    sedeOperativaId != null &&
    Number(envio.sedeDestinoId) === sedeOperativaId;

  const puedeCancelar = (envio) =>
    envio.estado === "Pendiente" &&
    sedeOperativaId != null &&
    Number(envio.sedeOrigenId) === sedeOperativaId;

  const handleCancelarEnvio = async () => {
    setGuardando(true);
    try {
      await envioService.cancelarEnvio(envioCancelar.id);
      toast.success("Envío cancelado. El stock fue devuelto a tu sede.");
      setModalCancelar(false);
      setEnvioCancelar(null);
      await cargarEnvios();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setGuardando(false);
    }
  };

  const renderAcciones = (fila) => {
    const acciones = [];
    if (puedeConfirmar(fila)) {
      acciones.push({
        label: "Confirmar recepción",
        variante: "success",
        onClick: () => abrirConfirmar(fila),
      });
    }
    if (puedeCancelar(fila)) {
      acciones.push({
        label: "Cancelar envío",
        variante: "danger",
        onClick: () => {
          setEnvioCancelar(fila);
          setModalCancelar(true);
        },
      });
    }
    return acciones;
  };

  return (
    <div className="envios-page">
      <div className="page-header">
        <div>
          <h1>Envíos entre Sedes</h1>
          <p className="env-subtitulo">
            Guías de envío de mercancía y confirmación de recepción
          </p>
        </div>
        {puedeCrear && (
          <button type="button" className="btn-primary" onClick={abrirNuevo}>
            <span className="material-symbols-outlined" aria-hidden="true">
              add
            </span>
            Nuevo envío
          </button>
        )}
      </div>

      <EnviosListado
        tab={tab}
        esAdmin={esAdmin}
        cargando={cargando}
        datosTabla={datosTabla}
        renderAcciones={renderAcciones}
        onTabChange={setTab}
      />

      {/* ── Modal: Nuevo envío ─────────────────────────────── */}
      <Modal
        isOpen={modalNuevo}
        onClose={() => setModalNuevo(false)}
        titulo="Nuevo envío entre sedes"
        onConfirmar={handleGuardarEnvio}
        textoBotonConfirmar={guardando ? "Guardando..." : "Crear envío"}
        disabled={guardando}
        maxWidth="640px"
      >
        <div className="env-form">
          {esAdmin && (
            <div className="form-group">
              <label htmlFor="env-origen">Sede origen *</label>
              <select
                id="env-origen"
                className="form-control"
                value={formNuevo.sedeOrigenId}
                onChange={(e) =>
                  setFormNuevo((p) => ({ ...p, sedeOrigenId: e.target.value }))
                }
              >
                <option value="">— Selecciona —</option>
                {bodegas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <span className="form-label-standalone">Sede(s) destino *</span>
            <div className="env-sedes-checks">
              {bodegas.flatMap((s) =>
                String(s.id) !== String(formNuevo.sedeOrigenId)
                  ? [
                      <label key={s.id} className="env-sede-check">
                        <input
                          type="checkbox"
                          checked={sedesDestinoSeleccionadas.has(s.id)}
                          onChange={() => toggleSedeDestino(s.id)}
                        />
                        {s.nombre}
                      </label>,
                    ]
                  : [],
              )}
            </div>
            <span className="form-hint">
              El mismo listado se enviará completo a cada sede seleccionada;
              verifica que la bodega de origen tenga existencias para todas.
            </span>
          </div>

          <div className="env-lineas">
            <span className="form-label-standalone">Productos *</span>
            {formNuevo.detalles.map((linea, idx) => (
              <div className="env-linea" key={linea._id}>
                <div className="env-linea__producto">
                  <input
                    type="text"
                    list={`env-productos-dl-${idx}`}
                    className="form-control"
                    placeholder="Busca por código o nombre..."
                    aria-label={`Producto de la línea ${idx + 1}`}
                    defaultValue=""
                    onChange={(e) => {
                      const match = e.target.value.match(/\[(\d+)\]/);
                      if (match) handleCambioLinea(idx, "productoId", match[1]);
                    }}
                  />
                  <datalist id={`env-productos-dl-${idx}`}>
                    {productos.map((p) => (
                      <option
                        key={p.codigo}
                        value={`[${p.codigo}] ${p.descripcion}`}
                      />
                    ))}
                  </datalist>
                </div>
                <input
                  type="number"
                  className="form-control env-linea__cantidad"
                  placeholder="Cant."
                  aria-label={`Cantidad de la línea ${idx + 1}`}
                  min="1"
                  value={linea.cantidad}
                  onChange={(e) =>
                    handleCambioLinea(idx, "cantidad", e.target.value)
                  }
                />
                {formNuevo.detalles.length > 1 && (
                  <button
                    type="button"
                    className="env-linea__quitar"
                    onClick={() => quitarLinea(idx)}
                    aria-label="Quitar producto"
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
            ))}
            <button
              type="button"
              className="btn-add-item"
              onClick={agregarLinea}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                add
              </span>
              Agregar producto
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="env-obs">Observaciones (opcional)</label>
            <textarea
              id="env-obs"
              className="form-control"
              rows={2}
              value={formNuevo.observaciones}
              onChange={(e) =>
                setFormNuevo((p) => ({ ...p, observaciones: e.target.value }))
              }
              placeholder="Ej: reposición mensual, pedido urgente..."
            />
          </div>
        </div>
      </Modal>

      {/* ── Modal: Confirmar recepción ─────────────────────── */}
      <Modal
        isOpen={modalConfirmar}
        onClose={() => setModalConfirmar(false)}
        titulo={`Confirmar recepción — ${envioActivo?.sedeOrigen?.nombre ?? ""} → ${envioActivo?.sedeDestino?.nombre ?? ""}`}
        onConfirmar={handleConfirmarRecepcion}
        textoBotonConfirmar={
          guardando ? "Confirmando..." : "Confirmar recepción"
        }
        disabled={guardando}
        maxWidth="640px"
      >
        {envioActivo && (
          <div className="env-form">
            <span className="form-hint">
              Indica cuánto llegó realmente de cada producto. Si es menos de lo
              enviado (faltante o unidades dañadas), cuéntanos qué pasó.
            </span>

            {formConfirmar.detalles.map((d, idx) => {
              const faltante =
                Number(d.cantidadEnviada) - Number(d.cantidadRecibida || 0);
              return (
                <div className="env-confirmar-linea" key={d.envioDetalleId}>
                  <div className="env-confirmar-linea__header">
                    <strong>{d.producto}</strong>
                    <span>Enviado: {d.cantidadEnviada}</span>
                  </div>
                  <div className="form-group">
                    <label htmlFor={`env-recibido-${idx}`}>
                      Cantidad recibida *
                    </label>
                    <input
                      id={`env-recibido-${idx}`}
                      type="number"
                      className="form-control"
                      min="0"
                      max={d.cantidadEnviada}
                      value={d.cantidadRecibida}
                      onChange={(e) =>
                        handleCambioDetalleConfirmar(
                          idx,
                          "cantidadRecibida",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  {faltante > 0 && (
                    <div className="form-group">
                      <label htmlFor={`env-obs-${idx}`}>
                        Observación *{" "}
                        <span className="env-faltante-aviso">
                          faltan {faltante} unidad(es)
                        </span>
                      </label>
                      <input
                        id={`env-obs-${idx}`}
                        type="text"
                        className="form-control"
                        placeholder="Ej: 2 unidades llegaron dañadas / faltaron en la caja"
                        value={d.observacion}
                        onChange={(e) =>
                          handleCambioDetalleConfirmar(
                            idx,
                            "observacion",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })}

            <div className="form-group">
              <label htmlFor="env-obs-general">
                Observación general (opcional)
              </label>
              <textarea
                id="env-obs-general"
                className="form-control"
                rows={2}
                value={formConfirmar.observacionRecepcion}
                onChange={(e) =>
                  setFormConfirmar((p) => ({
                    ...p,
                    observacionRecepcion: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: Cancelar envío ──────────────────────────── */}
      <Modal
        isOpen={modalCancelar}
        onClose={() => {
          setModalCancelar(false);
          setEnvioCancelar(null);
        }}
        titulo="Cancelar envío"
        onConfirmar={handleCancelarEnvio}
        textoBotonConfirmar={guardando ? "Cancelando..." : "Cancelar envío"}
        disabled={guardando}
        maxWidth="480px"
      >
        {envioCancelar && (
          <div className="env-form">
            <span className="form-hint">
              ¿Cancelar el envío hacia{" "}
              <strong>
                {envioCancelar.sedeDestino?.nombre ??
                  `sede ${envioCancelar.sedeDestinoId}`}
              </strong>
              ? Se devolverá el stock a su sede de origen.
            </span>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EnviosPage;
