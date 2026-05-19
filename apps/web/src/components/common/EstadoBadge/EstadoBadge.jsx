import { useMemo } from "react";
import "./EstadoBadge.css";

const CONFIG_ESTADO = {
  pendiente:  { label: "Pendiente",  color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
  confirmado: { label: "Confirmado", color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
  en_ruta:    { label: "En ruta",    color: "#ddb7ff", bg: "rgba(221,183,255,0.12)", border: "rgba(221,183,255,0.3)" },
  en_camino:  { label: "En camino",  color: "#ddb7ff", bg: "rgba(221,183,255,0.12)", border: "rgba(221,183,255,0.3)" },
  entregado:  { label: "Entregado",  color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  fallido:    { label: "Fallido",    color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
  asignado:   { label: "Asignado",   color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
  recibido:   { label: "Recibido",   color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  incompleto: { label: "Incompleto", color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
  entrada:    { label: "Entrada",    color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  salida:     { label: "Salida",     color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
  ajuste:     { label: "Ajuste",     color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
};

const EstadoBadge = ({ estado }) => {
  const config = useMemo(() => {
    return CONFIG_ESTADO[estado] || {
      label: estado || "—",
      color: "var(--on-surface-variant)",
      bg: "rgba(255,255,255,0.05)",
      border: "var(--outline-variant)",
    };
  }, [estado]);

  return (
    <span
      className="estado-badge"
      style={{
        color:           config.color,
        backgroundColor: config.bg,
        borderColor:     config.border,
      }}
    >
      {config.label}
    </span>
  );
};

export default EstadoBadge;