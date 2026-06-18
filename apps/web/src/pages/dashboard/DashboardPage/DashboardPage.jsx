import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import reportesApi from "@/api/reportesApi";
import pedidosApi from "@/api/pedidosApi";
import EstadoBadge from "@/components/common/EstadoBadge/EstadoBadge";
import { formatCOP, formatFechaHora } from "@/utils/formatters";

import "./DashboardPage.css";

// ─── Config KPIs ──────────────────────────────────────────────
const KPI_CONFIG = [
  {
    key: "pedidosPendientes",
    label: "Pedidos activos",
    icon: "shopping_cart",
    iconColor: "#ddb7ff",
    iconBg: "rgba(221,183,255,0.12)",
  },
  {
    key: "entregasEnRuta",
    label: "Entregas en ruta",
    icon: "local_shipping",
    iconColor: "#4ade80",
    iconBg: "rgba(74,222,128,0.12)",
  },
  {
    key: "ventasHoy",
    label: "Ingresos del día",
    icon: "payments",
    iconColor: "#e9c349",
    iconBg: "rgba(233,195,73,0.12)",
    esPeso: true,
  },
  {
    key: "alertasInventario",
    label: "Stock bajo",
    icon: "warning",
    iconColor: "#ffb4ab",
    iconBg: "rgba(255,180,171,0.12)",
  },
];

// ─── Spinner compacto ─────────────────────────────────────────
const SpinnerKPI = () => <div className="kpi-spinner" />;

const obtenerFechaISOHoy = () => {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
};

// ─── Componente ───────────────────────────────────────────────
const DashboardPage = () => {
  const { usuario } = useAuth();

  const [kpis, setKpis] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [cargandoKpis, setCargandoKpis] = useState(true);
  const [cargandoTabla, setCargandoTabla] = useState(true);
  const [errorKpis, setErrorKpis] = useState(false);

  // Determinar sede del usuario
  const sedeNombre =
    typeof usuario?.sede === "object"
      ? usuario.sede.nombre
      : (usuario?.sede ?? "Bogotá");
  const sedeId = usuario?.sedeId ?? null;

  // Saludo según hora
  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const nombre = usuario?.nombreCompleto?.split(" ")[0] || "Usuario";
  const fecha = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Carga KPIs desde panel-general ────────────────────────
  const cargarKpis = useCallback(async () => {
    setCargandoKpis(true);
    setErrorKpis(false);
    try {
      const filtros = { fecha: obtenerFechaISOHoy() };
      const data = await reportesApi.obtenerPanelGeneral(filtros);
      // panel-general devuelve { pedidosPendientes, entregasEnRuta, ventasHoy, alertasInventario, ... }
      setKpis(data);
    } catch {
      setErrorKpis(true);
      setKpis(null);
    } finally {
      setCargandoKpis(false);
    }
  }, []);

  // ── Carga últimos 5 pedidos ───────────────────────────────
  const cargarPedidos = useCallback(async () => {
    setCargandoTabla(true);
    try {
      const filtros = sedeId ? { sedeId, limit: 5 } : { limit: 5 };
      const data = await pedidosApi.obtenerPedidos(filtros);
      // El backend devuelve array o { data: [...] }
      const lista = Array.isArray(data) ? data : (data?.data ?? []);
      setPedidos(lista.slice(0, 5));
    } catch {
      setPedidos([]);
    } finally {
      setCargandoTabla(false);
    }
  }, [sedeId]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      cargarKpis();
      cargarPedidos();
    }, 0);
    return () => window.clearTimeout(id);
  }, [cargarKpis, cargarPedidos]);

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      {/* Encabezado */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="dashboard-header__saludo">
            {saludo}, {nombre}
          </h4>
          <div className="dashboard-header__sede">
            <span className="material-symbols-outlined">location_on</span>
            <span>Sede {sedeNombre}</span>
            {errorKpis && (
              <span className="dashboard-badge-mock">Sin conexión</span>
            )}
          </div>
        </div>
        <span className="dashboard-header__fecha">{fecha}</span>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        {KPI_CONFIG.map((kpi) => (
          <div className="col-12 col-sm-6 col-xl-3" key={kpi.key}>
            <div className="kpi-card">
              <div
                className="kpi-card__icon"
                style={{ backgroundColor: kpi.iconBg }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ color: kpi.iconColor }}
                >
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
          <span className="dashboard-tabla__badge">Datos en tiempo real</span>
        </div>

        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Cliente</th>
                <th>Sede</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {cargandoTabla ? (
                <tr>
                  <td colSpan={7} className="dashboard-tabla__cargando">
                    <div
                      className="kpi-spinner"
                      style={{ margin: "1.5rem auto" }}
                    />
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
                        {pedido.codigo ??
                          `KP-${String(pedido.id).padStart(4, "0")}`}
                      </span>
                    </td>
                    <td className="dashboard-tabla__cliente">
                      {pedido.cliente?.nombre ?? pedido.cliente ?? "—"}
                    </td>
                    <td>
                      <span className="dashboard-tabla__sede">
                        <span className="material-symbols-outlined">
                          location_on
                        </span>
                        {pedido.sede?.nombre ?? pedido.sede ?? sedeNombre}
                      </span>
                    </td>
                    <td>
                      <EstadoBadge
                        estado={pedido.estado?.toLowerCase?.() ?? pedido.estado}
                      />
                    </td>
                    <td className="dashboard-tabla__total">
                      {formatCOP(pedido.total ?? pedido.totalRecibido ?? 0)}
                    </td>
                    <td className="dashboard-tabla__fecha">
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
