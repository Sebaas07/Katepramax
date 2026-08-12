/**
 * formatters.js — Katepramax
 * Utilidades de formato reutilizables en todo el frontend.
 * Centraliza: pesos colombianos, fechas, números, porcentajes.
 */

// ── Formateadores Intl hoistados al módulo ────────────────────
// Se construyen una sola vez y se reusan en cada llamada.
const _copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
});

/**
 * Formatea un número como peso colombiano.
 * Ej: 1270000 → "$1.270.000"
 */
export const formatCOP = (valor) => {
  if (valor === null || valor === undefined || valor === "") return "$0";
  return _copFormatter.format(Number(valor));
};

/**
 * Formatea fecha ISO a texto corto legible.
 * Ej: "2025-05-11T09:10:00" → "11 may 2025"
 */
export const formatFecha = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Formatea fecha ISO a texto con hora.
 * Ej: "2025-05-11T09:10:00" → "11 may 2025, 9:10 a.m."
 */
export const formatFechaHora = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * Formatea hora relativa (hace X minutos / horas).
 * Ej: "Hace 5 minutos"
 */
export const formatRelativo = (iso) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias > 1 ? "s" : ""}`;
};

/**
 * Trunca texto largo con elipsis.
 * Ej: "Texto muy largo..." → "Texto muy lar..."
 */
export const truncar = (texto, max = 40) => {
  if (!texto) return "—";
  return texto.length > max ? texto.slice(0, max) + "..." : texto;
};

/**
 * Obtiene el número de semana ISO de una fecha.
 * Ej: new Date("2025-05-11") → 19
 */
export const getSemanaISO = (fecha = new Date()) => {
  const d = new Date(
    Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

/**
 * Obtiene el rango de fechas (inicio/fin) de una semana ISO.
 * Ej: getRangoSemana(19, 2025) → { inicio: "2025-05-05", fin: "2025-05-11" }
 */
export const getRangoSemana = (semana, anio = new Date().getFullYear()) => {
  const jan4 = new Date(Date.UTC(anio, 0, 4));
  const dayOfWeek = jan4.getUTCDay() || 7;
  const week1Start = new Date(jan4);
  week1Start.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1);
  const start = new Date(week1Start);
  start.setUTCDate(week1Start.getUTCDate() + (semana - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return {
    inicio: start.toISOString().split("T")[0],
    fin: end.toISOString().split("T")[0],
  };
};

// formatNumero, formatPorcentaje y capitalizar están disponibles internamente
// si en el futuro se necesitan exportar, agregar el keyword export.
