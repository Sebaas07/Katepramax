import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import pedidosService from "@/services/pedidos.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import "./DistribucionPage.css";

// ─── Spinner ──────────────────────────────────────────────────
const Spinner = () => (
  <div className="dist-spinner-wrap">
    <div className="dist-spinner" />
    <span>Cargando distribución...</span>
  </div>
);

// ─── Tarjeta de KPI compacta ──────────────────────────────────
const KpiCard = ({ icono, valor, label, color }) => (
  <div className="dist-kpi" style={{ "--kpi-color": color }}>
    <span className="material-symbols-outlined dist-kpi__icon">{icono}</span>
    <div className="dist-kpi__texto">
      <span className="dist-kpi__valor">{valor}</span>
      <span className="dist-kpi__label">{label}</span>
    </div>
  </div>
);

// ─── Tabs disponibles ─────────────────────────────────────────
const TABS = [
  { key: "flujo",     label: "Flujo del día",    icon: "timeline"        },
  { key: "pendientes",label: "Pendientes",        icon: "pending_actions" },
  { key: "asignados", label: "Asignados",         icon: "delivery_dining" },
  { key: "entregados",label: "Entregados hoy",    icon: "check_circle"    },
  { key: "fallidos",  label: "Fallidos",          icon: "cancel"          },
];

const DistribucionPage = () => {
   const [tab,       setTab]       = useState("flujo");
  const [pedidos,   setPedidos]   = useState([]);
  const [cargando,  setCargando]  = useState(false);

  // ── Carga ─────────────────────────────────────────────────
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const data = await pedidosService.obtenerPedidos({});
      setPedidos(data);
    } catch (err) {
      toast.error("Error al cargar datos: " + err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDatos();
  }, [cargarDatos]);

  // ── Contadores ─────────────────────────────────────────────
  const pendientes  = pedidos.filter((p) => p.estado === "Pendiente").length;
  const asignados   = pedidos.filter((p) => p.estado === "Asignado").length;
  const enRuta      = pedidos.filter((p) => p.asignaciones?.some((a) => a.estado === "EnRuta")).length;
  const entregados  = pedidos.filter((p) => p.estado === "Entregado").length;
  const fallidos    = pedidos.filter((p) =>
    p.asignaciones?.some((a) => a.estado === "Fallido")
  ).length;
  const cancelados  = pedidos.filter((p) => p.estado === "Cancelado").length;

  // ── Pedidos filtrados por tab ──────────────────────────────
  const pedidosPorTab = {
    flujo:      pedidos,
    pendientes: pedidos.filter((p) => p.estado === "Pendiente"),
    asignados:  pedidos.filter((p) => p.estado === "Asignado"),
    entregados: pedidos.filter((p) => p.estado === "Entregado"),
    fallidos:   pedidos.filter((p) =>
      p.asignaciones?.some((a) => a.estado === "Fallido")
    ),
  };

  // Mapear campos anidados para la tabla
  const mapear = (lista) => lista.map((p) => ({
    ...p,
    cliente:    p.cliente?.nombre ?? "—",
    entregador: p.asignaciones?.[0]?.entregador?.nombreCompleto ?? "Sin asignar",
    estado:     p.estado,
  }));

  // ── Columnas ───────────────────────────────────────────────
  const columnasFlujo = [
    { campo: "id",            label: "#",          tipo: "texto"  },
    { campo: "cliente",       label: "Cliente",    tipo: "texto"  },
    { campo: "estado",        label: "Estado",     tipo: "estado" },
    { campo: "entregador",    label: "Entregador", tipo: "texto"  },
    { campo: "totalRecibido", label: "Total",      tipo: "moneda" },
    { campo: "creadoEn",      label: "Creado",     tipo: "fecha"  },
  ];

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="distribucion-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Distribución</h1>
          <p className="dist-subtitulo">
            Flujo de pedidos y estado de entregas en tiempo real
          </p>
        </div>
        <button
          className="btn-outline-gold"
          onClick={cargarDatos}
          disabled={cargando}
          type="button"
        >
          <span className="material-symbols-outlined">refresh</span>
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="dist-kpis">
        <KpiCard icono="pending_actions"   valor={pendientes} label="Pendientes"  color="var(--aged-gold)"  />
        <KpiCard icono="delivery_dining"   valor={asignados}  label="Asignados"   color="var(--primary)"    />
        <KpiCard icono="local_shipping"    valor={enRuta}     label="En ruta"     color="#ddb7ff"           />
        <KpiCard icono="check_circle"      valor={entregados} label="Entregados"  color="#4ade80"           />
        <KpiCard icono="cancel"            valor={fallidos}   label="Fallidos"    color="var(--error)"      />
        <KpiCard icono="do_not_disturb_on" valor={cancelados} label="Cancelados"  color="var(--outline)"    />
      </div>

      {/* Tabs + Tabla */}
      <div className="dist-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "tab-active" : "tab-btn"}
            onClick={() => setTab(t.key)}
          >
            <span className="material-symbols-outlined">{t.icon}</span>
            {t.label}
            {pedidosPorTab[t.key]?.length > 0 && (
              <span className="dist-tab-count">
                {pedidosPorTab[t.key].length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : pedidosPorTab[tab].length === 0 ? (
          <div className="dist-empty">
            <span className="material-symbols-outlined">inbox</span>
            <p>No hay pedidos en este estado.</p>
          </div>
        ) : (
          <TablaGenerica
            columnas={columnasFlujo}
            datos={mapear(pedidosPorTab[tab])}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["cliente", "entregador"]}
            paginacion
          />
        )}
      </div>
    </div>
  );
};

export default DistribucionPage;
