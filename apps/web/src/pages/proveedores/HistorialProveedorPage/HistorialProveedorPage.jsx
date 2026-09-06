import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import inventarioService from "@/services/inventario.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import DatePicker from "@/components/common/DatePicker/DatePicker";
import EmptyState from "@/components/common/EmptyState/EmptyState";
import { formatCOP } from "@/utils/formatters";
import "./HistorialProveedorPage.css";

const Spinner = () => (
  <div className="hp-spinner-wrap">
    <div className="hp-spinner" />
    <span>Cargando historial de entradas...</span>
  </div>
);

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const HistorialProveedorPage = () => {
  const { proveedorId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isSessionChecked } = useAuth();

  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    try {
      const filtros = {};
      if (desde) filtros.desde = desde;
      if (hasta) filtros.hasta = hasta;
      const result = await inventarioService.obtenerHistorialProveedor(
        proveedorId,
        filtros,
      );
      setData(result);
    } catch (err) {
      toast.error("Error al cargar el historial: " + err.message);
      setData(null);
    } finally {
      setCargando(false);
    }
  }, [proveedorId, desde, hasta]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => {
      void cargarHistorial();
    }, 0);
    return () => window.clearTimeout(id);
  }, [isSessionChecked, isAuthenticated, cargarHistorial]);

  const limpiarFiltros = () => {
    setDesde("");
    setHasta("");
  };

  const periodo = data?.resumen?.periodo;
  const global = data?.resumen?.global;
  const hayFiltroFechas = Boolean(desde) || Boolean(hasta);

  const filasTabla = useMemo(
    () =>
      (data?.entradas ?? []).map((e) => ({
        ...e,
        producto: e.producto?.descripcion ?? `Producto ${e.productoId}`,
        sede: e.sede?.nombre ?? `Sede ${e.sedeId}`,
        costoUnitario: toNumber(e.costoUnitario),
        total: toNumber(e.total),
        deuda: e.deuda == null ? null : toNumber(e.deuda),
      })),
    [data],
  );

  const columnas = [
    { campo: "id", label: "No.", tipo: "texto" },
    { campo: "fecha", label: "Fecha", tipo: "fecha" },
    { campo: "producto", label: "Producto", tipo: "texto" },
    { campo: "sede", label: "Sede", tipo: "texto" },
    { campo: "cantidadIngresada", label: "Cant.", tipo: "texto" },
    { campo: "costoUnitario", label: "Costo unit.", tipo: "moneda" },
    { campo: "total", label: "Total", tipo: "moneda" },
    { campo: "deuda", label: "Deuda", tipo: "moneda" },
    { campo: "estado", label: "Estado", tipo: "estado" },
    { campo: "nota", label: "Nota", tipo: "texto" },
  ];

  const saldoPendiente = toNumber(global?.saldoPendiente);

  return (
    <div className="hp-page">
      <div className="page-header">
        <div className="hp-header-titulo">
          <button
            type="button"
            className="hp-volver"
            onClick={() => navigate(-1)}
            aria-label="Volver atrás"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </button>
          <div>
            <h1>Historial de Entradas</h1>
            {data?.proveedor && (
              <p className="page-subtitulo">{data.proveedor.nombre}</p>
            )}
          </div>
        </div>
      </div>

      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : (
          <>
            {/* Resumen */}
            <div className="hp-resumen-row">
              <div className="hp-card">
                <span
                  className="material-symbols-outlined hp-card__icon"
                  aria-hidden="true"
                >
                  inventory_2
                </span>
                <div className="hp-card__info">
                  <span className="hp-card__titulo">Entradas</span>
                  <strong className="hp-card__valor">
                    {toNumber(periodo?.totalEntradas)}
                  </strong>
                </div>
              </div>

              <div className="hp-card">
                <span
                  className="material-symbols-outlined hp-card__icon"
                  aria-hidden="true"
                >
                  payments
                </span>
                <div className="hp-card__info">
                  <span className="hp-card__titulo">Monto total (periodo)</span>
                  <strong className="hp-card__valor">
                    {formatCOP(periodo?.montoTotal)}
                  </strong>
                </div>
              </div>

              <div className="hp-card">
                <span
                  className="material-symbols-outlined hp-card__icon"
                  aria-hidden="true"
                >
                  account_balance_wallet
                </span>
                <div className="hp-card__info">
                  <span className="hp-card__titulo">
                    Deuda registrada (periodo)
                  </span>
                  <strong className="hp-card__valor">
                    {formatCOP(periodo?.deudaRegistrada)}
                  </strong>
                </div>
              </div>

              <div className="hp-card">
                <span
                  className="material-symbols-outlined hp-card__icon"
                  aria-hidden="true"
                >
                  receipt_long
                </span>
                <div className="hp-card__info">
                  <span className="hp-card__titulo">Total abonado</span>
                  <strong className="hp-card__valor">
                    {formatCOP(global?.totalAbonado)}
                  </strong>
                </div>
              </div>

              <div
                className={`hp-card hp-card--saldo ${
                  saldoPendiente > 0 ? "hp-card--deuda" : "hp-card--al-dia"
                }`}
              >
                <span
                  className="material-symbols-outlined hp-card__icon"
                  aria-hidden="true"
                >
                  account_balance
                </span>
                <div className="hp-card__info">
                  <span className="hp-card__titulo">Saldo pendiente</span>
                  <strong className="hp-card__valor">
                    {formatCOP(saldoPendiente)}
                  </strong>
                </div>
              </div>
            </div>

            <p className="hp-leyenda">
              Los abonos se aplican al total de la deuda del proveedor, no a una
              entrada en particular. El saldo pendiente se totaliza sumando las
              entradas registradas al nombre del proveedor menos lo abonado.
            </p>

            {/* Filtros de fecha */}
            <div className="hp-filtros">
              <div className="form-group hp-filtro">
                <label htmlFor="hp-desde">Desde</label>
                <DatePicker
                  id="hp-desde"
                  name="desde"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  max={hasta || undefined}
                  placeholder="Buscar fecha..."
                />
              </div>
              <div className="form-group hp-filtro">
                <label htmlFor="hp-hasta">Hasta</label>
                <DatePicker
                  id="hp-hasta"
                  name="hasta"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  min={desde || undefined}
                  placeholder="Buscar fecha..."
                />
              </div>
              {hayFiltroFechas && (
                <button
                  type="button"
                  className="hp-limpiar"
                  onClick={limpiarFiltros}
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    restart_alt
                  </span>
                  Limpiar
                </button>
              )}
            </div>

            {/* Listado */}
            {filasTabla.length > 0 ? (
              <TablaGenerica
                columnas={columnas}
                datos={filasTabla}
                filasPorPagina={10}
                mostrarBuscador
                buscarEnCampos={["producto", "sede", "nota", "id"]}
                paginacion
              />
            ) : (
              <EmptyState
                icono="inbox"
                titulo="Sin entradas registradas"
                detalle={
                  hayFiltroFechas
                    ? "No hay entradas de inventario en el rango de fechas seleccionado."
                    : "Este proveedor aún no tiene entradas de inventario registradas a su nombre."
                }
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HistorialProveedorPage;