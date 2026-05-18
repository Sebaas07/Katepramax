import { useMemo } from "react";
import "./EstadoBadge.css";

// CONFIG_ESTADO debe coincidir con la definición en los mocks
const CONFIG_ESTADO = {
  pendiente: { label: "Pendiente", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "#fbbf24" },
  confirmado: { label: "Confirmado", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "#3b82f6" },
  en_camino: { label: "En camino", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "#8b5cf6" },
  entregado: { label: "Entregado", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "#10b981" },
  fallido: { label: "Fallido", color: "#ef4444", bg: "rgba(236,68,64,0.1)", border: "#ef4444" },
};

const EstadoBadge = ({ estado }) => {
  const estadoConfig = useMemo(() => {
    return CONFIG_ESTADO[estado] || CONFIG_ESTADO.pendiente; // Default to pendiente
  }, [estado]);

  return (
    <span
      className="estado-badge"
      style={{
        color: estadoConfig.color,
        backgroundColor: estadoConfig.bg,
        borderColor: estadoConfig.border,
      }}
    >
      {estadoConfig.label}
    </span>
  );
};

export default EstadoBadge;