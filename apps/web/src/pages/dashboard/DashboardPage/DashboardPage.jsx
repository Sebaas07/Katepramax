import { obtenerSesion, esBodegaBogota } from "@/utils/sessionHelper";
import * as bogotaMocks from "@/mocks/datos.mock";
import * as cartagenaMocks from "@/mocks/datosCartagena.mock";
import "./DashboardPage.css";

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

const DashboardPage = () => {
  const usuario  = obtenerSesion();
  const esBogota = esBodegaBogota();
  const mocks = usuario?.sede === "Cartagena" ? cartagenaMocks : bogotaMocks;

  const hora    = new Date().getHours();
  const saludo  = hora < 12 ? "Buenos días" : hora < 18 ? "Buenas tardes" : "Buenas noches";
  const nombre  = usuario?.nombreCompleto?.split(" ")[0] || "Usuario";

  const fecha = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    year:    "numeric",
    month:   "long",
    day:     "numeric",
  });

  // Mostrar solo los últimos 5 pedidos
  const pedidos = mocks.PEDIDOS_MOCK.slice(0, 5);

  return (
    <div>

      {/* ── Encabezado ── */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-2">
        <div>
          <h4 className="dashboard-header__saludo">
            {saludo}, {nombre}
          </h4>
          <div className="dashboard-header__sede">
            <span className="material-symbols-outlined">location_on</span>
            <span>Sede {usuario?.sede}</span>
            {esBogota && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  fontSize: "10px",
                  fontWeight: "600",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--secondary)",
                  background: "rgba(233,195,73,0.1)",
                  border: "1px solid rgba(233,195,73,0.25)",
                  padding: "2px 8px",
                  borderRadius: "999px",
                }}
              >
                Bodega principal
              </span>
            )}
          </div>
        </div>
        <span className="dashboard-header__fecha">{fecha}</span>
      </div>

      {/* ── KPIs ── */}
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
                <div className="kpi-card__valor">
                  {kpi.esPeso
                    ? mocks.formatearPesos(mocks.KPI_MOCK[kpi.key])
                    : mocks.KPI_MOCK[kpi.key]}
                </div>
                <div className="kpi-card__label">{kpi.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabla de últimos pedidos ── */}
      <div className="dashboard-tabla">
        <div className="dashboard-tabla__header">
          <h6 className="dashboard-tabla__titulo">
            <span className="material-symbols-outlined">history</span>
            Últimos pedidos
          </h6>
          <span className="dashboard-tabla__badge">Datos de hoy</span>
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
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => {
                const est = mocks.CONFIG_ESTADO[pedido.estado];
                return (
                  <tr key={pedido.id}>
                    <td className="dashboard-tabla__num">
                      #{pedido.id}
                    </td>
                    <td>
                      <span style={{
                        fontFamily: "var(--font-label)",
                        fontSize: "12px",
                        color: "var(--secondary)",
                        fontWeight: 600,
                      }}>
                        {pedido.codigo}
                      </span>
                    </td>
                    <td className="dashboard-tabla__cliente">
                      {pedido.cliente}
                    </td>
                    <td>
                      <span className="dashboard-tabla__sede">
                        <span className="material-symbols-outlined">
                          location_on
                        </span>
                        {pedido.sede}
                      </span>
                    </td>
                    <td>
                      <span
                        className="estado-badge"
                        style={{
                          color:           est.color,
                          backgroundColor: est.bg,
                          borderColor:     est.border,
                        }}
                      >
                        {est.label}
                      </span>
                    </td>
                    <td className="dashboard-tabla__total">
                      {mocks.formatearPesos(pedido.total)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;