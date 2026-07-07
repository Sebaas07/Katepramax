import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { filtrarPorSede } from "@/utils/permisos";
import reportesApi from "@/api/reportesApi";
import pedidosApi from "@/api/pedidosApi";
import inventarioService from "@/services/inventario.service";
import EstadoBadge from "@/components/common/EstadoBadge/EstadoBadge";
import { formatCOP, formatFechaHora } from "@/utils/formatters";
import "./DashboardPage.css";

// ── Config KPIs ───────────────────────────────────────────────
const KPI_CONFIG = [
  {
    key:       "pedidosPendientes",
    label:     "Pedidos activos",
    icon:      "shopping_cart",
    iconColor: "#ddb7ff",
    iconBg:    "rgba(221,183,255,0.12)",
  },
  {
    key:       "entregasEnRuta",
    label:     "Entregas en ruta",
    icon:      "local_shipping",
    iconColor: "#4ade80",
    iconBg:    "rgba(74,222,128,0.12)",
  },
  {
    key:       "ventasHoy",
    label:     "Ingresos del día",
    icon:      "payments",
    iconColor: "#e9c349",
    iconBg:    "rgba(233,195,73,0.12)",
    esPeso:    true,
  },
  {
    key:       "alertasInventario",
    label:     "Stock bajo",
    icon:      "warning",
    iconColor: "#ffb4ab",
    iconBg:    "rgba(255,180,171,0.12)",
  },
];

const SpinnerKPI = () => <div className="kpi-spinner" aria-label="Cargando" />;

const obtenerFechaISOHoy = () => {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
};

// ── Componente ────────────────────────────────────────────────
const DashboardPage = () => {
  const { usuario, esAdmin, isAuthenticated, isSessionChecked } = useAuth();
  const [searchParams] = useSearchParams();

  // Solo Admin puede filtrar por una sede específica desde el menú superior;
  // para el resto, el backend fuerza su propia sede sin importar este valor.
  const sedeIdSeleccionada = esAdmin ? searchParams.get("sede") : null;

  const [sedesCatalogo, setSedesCatalogo] = useState([]);
  useEffect(() => {
    if (!esAdmin) return;
    inventarioService
      .obtenerSedes()
      .then((data) => setSedesCatalogo(Array.isArray(data) ? data : []))
      .catch(() => setSedesCatalogo([]));
  }, [esAdmin]);

  const sedeNombreMostrado = (() => {
    if (esAdmin && sedeIdSeleccionada) {
      const encontrada = sedesCatalogo.find(
        (s) => String(s.id) === String(sedeIdSeleccionada),
      );
      if (encontrada) return encontrada.nombre;
    }
    if (esAdmin && !sedeIdSeleccionada) return "Todas";
    return typeof usuario?.sede === "object"
      ? usuario.sede.nombre
      : (usuario?.sede ?? "—");
  })();

  const [kpis,          setKpis]          = useState(null);
  const [pedidos,       setPedidos]       = useState([]);
  const [cargandoKpis,  setCargandoKpis]  = useState(true);
  const [cargandoTabla, setCargandoTabla] = useState(true);
  const [errorKpis,     setErrorKpis]     = useState(false);

  const hora   = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const nombre = usuario?.nombreCompleto?.split(" ")[0] || "Usuario";
  const fecha  = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // ── KPIs desde /reportes/panel-general ───────────────────
  const cargarKpis = useCallback(async () => {
    setCargandoKpis(true);
    setErrorKpis(false);
    try {
      // filtrarPorSede aplica sedeId automáticamente para Bodega/AdminBogota;
      // para Admin, respeta el filtro elegido en el menú superior (si hay).
      const filtros = filtrarPorSede({
        fecha: obtenerFechaISOHoy(),
        sedeId: sedeIdSeleccionada || undefined,
      });
      const data    = await reportesApi.obtenerPanelGeneral(filtros);
      setKpis(data);
    } catch {
      setErrorKpis(true);
      setKpis(null);
    } finally {
      setCargandoKpis(false);
    }
  }, [sedeIdSeleccionada]);

  // ── Últimos pedidos ───────────────────────────────────────
  const cargarPedidos = useCallback(async () => {
    setCargandoTabla(true);
    try {
      // filtrarPorSede garantiza que Bodega solo vea su sede
      const filtros = filtrarPorSede({
        take: 5,
        sedeId: sedeIdSeleccionada || undefined,
      });
      const data    = await pedidosApi.obtenerPedidos(filtros);
      const lista   = Array.isArray(data) ? data : (data?.data ?? []);
      setPedidos(lista.slice(0, 5));
    } catch {
      setPedidos([]);
    } finally {
      setCargandoTabla(false);
    }
  }, [sedeIdSeleccionada]);

  useEffect(() => {
    if (!isSessionChecked || !isAuthenticated) return;
    const id = window.setTimeout(() => {
      cargarKpis();
      cargarPedidos();
    }, 0);
    return () => window.clearTimeout(id);
  }, [cargarKpis, cargarPedidos, isSessionChecked, isAuthenticated]);

  return (
    <div className="dashboard-page">
      {/* Encabezado */}
      <div className="dashboard-header">
        <div className="dashboard-header__left">
          <h4 className="dashboard-header__saludo">{saludo}, {nombre}</h4>
          <div className="dashboard-header__sede">
            <span className="material-symbols-outlined">location_on</span>
            <span>Sede {sedeNombreMostrado}</span>
            {errorKpis && (
              <span className="dashboard-badge-mock">Sin conexión</span>
            )}
          </div>
        </div>
        <span className="dashboard-header__fecha">{fecha}</span>
      </div>

      {/* KPIs */}
      <div className="dashboard-kpis">
        {KPI_CONFIG.map((kpi) => (
          <div className="kpi-card" key={kpi.key}>
            <div className="kpi-card__icon" style={{ backgroundColor: kpi.iconBg }}>
              <span className="material-symbols-outlined" style={{ color: kpi.iconColor }}>
                {kpi.icon}
              </span>
            </div>
            <div>
              {cargandoKpis ? (
                <SpinnerKPI />
              ) : (
                <div className="kpi-card__valor">
                  {kpi.esPeso
                    ? formatCOP(kpis?.[kpi.key] ?? 0)
                    : (kpis?.[kpi.key] ?? 0)}
                </div>
              )}
              <div className="kpi-card__label">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla últimos pedidos */}
      <div className="dashboard-tabla">
        <div className="dashboard-tabla__header">
          <h6 className="dashboard-tabla__titulo">
            <span className="material-symbols-outlined">history</span>
            Últimos pedidos
          </h6>
          <span className="dashboard-tabla__badge">Tiempo real</span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover mb-0" aria-label="Últimos pedidos">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th className="d-none d-sm-table-cell">Cliente</th>
                <th className="d-none d-md-table-cell">Sede</th>
                <th>Estado</th>
                <th className="d-none d-sm-table-cell">Total</th>
                <th className="d-none d-lg-table-cell">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {cargandoTabla ? (
                <tr>
                  <td colSpan={7} className="dashboard-tabla__cargando">
                    <div className="kpi-spinner" style={{ margin: "1.5rem auto" }} />
                  </td>
                </tr>
              ) : pedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="dashboard-tabla__vacio">
                    No hay pedidos recientes.
                  </td>
                </tr>
              ) : (
                pedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td className="dashboard-tabla__num">#{pedido.id}</td>
                    <td>
                      <span className="dashboard-tabla__codigo">
                        {pedido.codigo ?? `KP-${String(pedido.id).padStart(4, "0")}`}
                      </span>
                    </td>
                    <td className="dashboard-tabla__cliente d-none d-sm-table-cell">
                      {pedido.cliente?.nombre ?? pedido.cliente ?? "—"}
                    </td>
                    <td className="d-none d-md-table-cell">
                      <span className="dashboard-tabla__sede">
                        <span className="material-symbols-outlined">location_on</span>
                        {pedido.creador?.sede?.nombre ?? pedido.sede?.nombre ?? sedeNombreMostrado}
                      </span>
                    </td>
                    <td>
                      <EstadoBadge estado={pedido.estado?.toLowerCase?.() ?? pedido.estado} />
                    </td>
                    <td className="dashboard-tabla__total d-none d-sm-table-cell">
                      {formatCOP(pedido.total ?? pedido.totalRecibido ?? 0)}
                    </td>
                    <td className="dashboard-tabla__fecha d-none d-lg-table-cell">
                      {formatFechaHora(pedido.creadoEn ?? pedido.fechaCreacion)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
