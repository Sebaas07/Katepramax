import { useMemo } from "react";
import "./EstadoBadge.css";

/**
 * EstadoBadge — Katepramax
 * Badge de estado reutilizable. Soporta todos los estados del sistema.
 */
const CONFIG_ESTADO = {
  // ── Pedidos ──
  pendiente:  { label: "Pendiente",  color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
  asignado:   { label: "Asignado",   color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
  en_ruta:    { label: "En ruta",    color: "#ddb7ff", bg: "rgba(221,183,255,0.12)", border: "rgba(221,183,255,0.3)" },
  en_camino:  { label: "En camino",  color: "#ddb7ff", bg: "rgba(221,183,255,0.12)", border: "rgba(221,183,255,0.3)" },
  entregado:  { label: "Entregado",  color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  confirmado: { label: "Confirmado", color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
  fallido:    { label: "Fallido",    color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
  cancelado:  { label: "Cancelado",  color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
  // ── Inventario ──
  entrada:    { label: "Entrada",    color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  salida:     { label: "Salida",     color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
  ajuste:     { label: "Ajuste",     color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
  // ── General ──
  activo:     { label: "Activo",     color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  inactivo:   { label: "Inactivo",   color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
  recibido:   { label: "Recibido",   color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  incompleto: { label: "Incompleto", color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
  // ── Deudas proveedores ──
  pagado:     { label: "Pagado",     color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  parcial:    { label: "Parcial",    color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
  al_dia:    { label: "Al dia",    color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  pendiente: { label: "Pendiente", color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
  vencida:   { label: "Vencida",   color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
};

const EstadoBadge = ({ estado }) => {
  // Normalizar: boolean true/false → "activo"/"inactivo"
  const estadoNorm = useMemo(() => {
    if (estado === true || estado === "true") return "activo";
    if (estado === false || estado === "false") return "inactivo";
    return typeof estado === "string" ? estado.toLowerCase() : estado;
  }, [estado]);

  const config = useMemo(() => {
    return (
      CONFIG_ESTADO[estadoNorm] ?? {
        label: estado ?? "—",
        color: "var(--on-surface-variant)",
        bg: "rgba(255,255,255,0.05)",
        border: "var(--outline-variant)",
      }
    );
  }, [estadoNorm, estado]);

  return (
    <span
      className="estado-badge"
      style={{
        color: config.color,
        backgroundColor: config.bg,
        borderColor: config.border,
      }}
    >
      {config.label}
    </span>
  );
};

export default EstadoBadge;
