import { obtenerSesion, esBodegaBogota } from "@/utils/sessionHelper";

// Datos placeholder — se reemplazarán con llamadas a la API
const KPI_PLACEHOLDER = [
  {
    label: "Pedidos activos",
    valor: 12,
    icon: "bi-clipboard2-check",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    label: "Entregas pendientes",
    valor: 5,
    icon: "bi-truck",
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  {
    label: "Ingresos del día",
    valor: "$1.250.000",
    icon: "bi-cash-stack",
    color: "#ca8a04",
    bg: "#fefce8",
  },
  {
    label: "Productos stock bajo",
    valor: 3,
    icon: "bi-exclamation-triangle",
    color: "#dc2626",
    bg: "#fef2f2",
  },
];

const PEDIDOS_PLACEHOLDER = [
  { id: 1, cliente: "Carlos Pérez",    sede: "Bogotá",         estado: "En ruta",  total: "$85.000"  },
  { id: 2, cliente: "Ana Gómez",       sede: "Cartagena",      estado: "Pendiente", total: "$120.000" },
  { id: 3, cliente: "Luis Martínez",   sede: "Villavicencio",  estado: "Entregado", total: "$45.000"  },
  { id: 4, cliente: "María Torres",    sede: "Bogotá",         estado: "Pendiente", total: "$200.000" },
  { id: 5, cliente: "Jorge Ramírez",   sede: "Cartagena",      estado: "En ruta",  total: "$67.000"  },
];

// Color del badge según el estado del pedido
const ESTADO_BADGE = {
  "Pendiente": { color: "#92400e", bg: "#fef3c7" },
  "En ruta":   { color: "#1e40af", bg: "#dbeafe" },
  "Entregado": { color: "#166534", bg: "#dcfce7" },
  "Fallido":   { color: "#991b1b", bg: "#fee2e2" },
};

const DashboardPage = () => {
  const usuario = obtenerSesion();
  const esBogota = esBodegaBogota();

  // Saludo según la hora del día
  const hora = new Date().getHours();
  const saludo =
    hora < 12 ? "Buenos días" :
    hora < 18 ? "Buenas tardes" :
                "Buenas noches";

  return (
    <div>

      {/* ── Encabezado ───────────────────────────────────────────────────── */}
      <div className="d-flex align-items-start justify-content-between mb-4 flex-wrap gap-3">
        <div>
          <h4 className="fw-bold mb-1" style={{ color: "#0f1b2d" }}>
            {saludo}, {usuario?.nombreCompleto?.split(" ")[0]} 👋
          </h4>
          <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
            {usuario?.sede && (
              <>
                <i className="bi bi-geo-alt-fill me-1" style={{ color: "#22c55e" }}></i>
                Sede {usuario.sede}
              </>
            )}
            {esBogota && (
              <span
                className="ms-2 badge"
                style={{ backgroundColor: "#f0fdf4", color: "#166534", fontSize: "0.7rem" }}
              >
                <i className="bi bi-star-fill me-1"></i>
                Bodega principal
              </span>
            )}
          </p>
        </div>
        <span className="text-muted" style={{ fontSize: "0.85rem" }}>
          {new Date().toLocaleDateString("es-CO", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      {/* ── Tarjetas KPI ─────────────────────────────────────────────────── */}
      <div className="row g-3 mb-4">
        {KPI_PLACEHOLDER.map((kpi) => (
          <div className="col-12 col-sm-6 col-xl-3" key={kpi.label}>
            <div
              className="p-3 rounded-3 h-100 d-flex align-items-center gap-3"
              style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
            >
              <div
                className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: kpi.bg,
                }}
              >
                <i className={`bi ${kpi.icon}`} style={{ fontSize: "1.375rem", color: kpi.color }}></i>
              </div>
              <div>
                <div className="fw-bold" style={{ fontSize: "1.375rem", color: "#0f1b2d", lineHeight: 1.2 }}>
                  {kpi.valor}
                </div>
                <div className="text-muted" style={{ fontSize: "0.8125rem" }}>
                  {kpi.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Últimos pedidos ───────────────────────────────────────────────── */}
      <div
        className="rounded-3 overflow-hidden"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
      >
        {/* Encabezado de la tabla */}
        <div
          className="d-flex align-items-center justify-content-between px-4 py-3"
          style={{ borderBottom: "1px solid #e2e8f0" }}
        >
          <h6 className="fw-bold mb-0" style={{ color: "#0f1b2d" }}>
            <i className="bi bi-clock-history me-2" style={{ color: "#22c55e" }}></i>
            Últimos pedidos
          </h6>
          <span className="badge rounded-pill" style={{ backgroundColor: "#f1f5f9", color: "#64748b", fontSize: "0.75rem" }}>
            Datos de hoy
          </span>
        </div>

        {/* Tabla */}
        <div className="table-responsive">
          <table className="table table-hover mb-0" style={{ fontSize: "0.875rem" }}>
            <thead style={{ backgroundColor: "#f8fafc" }}>
              <tr>
                <th className="px-4 py-3 fw-semibold text-muted border-0">#</th>
                <th className="px-4 py-3 fw-semibold text-muted border-0">Cliente</th>
                <th className="px-4 py-3 fw-semibold text-muted border-0">Sede</th>
                <th className="px-4 py-3 fw-semibold text-muted border-0">Estado</th>
                <th className="px-4 py-3 fw-semibold text-muted border-0">Total</th>
              </tr>
            </thead>
            <tbody>
              {PEDIDOS_PLACEHOLDER.map((pedido) => {
                const badge = ESTADO_BADGE[pedido.estado] || ESTADO_BADGE["Pendiente"];
                return (
                  <tr key={pedido.id}>
                    <td className="px-4 py-3 text-muted">#{pedido.id}</td>
                    <td className="px-4 py-3 fw-medium" style={{ color: "#0f1b2d" }}>
                      {pedido.cliente}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <i className="bi bi-geo-alt me-1"></i>
                      {pedido.sede}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="badge rounded-pill px-3 py-1"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.color,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 fw-semibold" style={{ color: "#0f1b2d" }}>
                      {pedido.total}
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