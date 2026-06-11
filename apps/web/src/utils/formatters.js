/**
 * formatters.js — Katepramax
 * Utilidades de formato reutilizables en todo el frontend.
 * Centraliza: pesos colombianos, fechas, números, porcentajes.
 */

/**
 * Formatea un número como peso colombiano.
 * Ej: 1270000 → "$1.270.000"
 */
export const formatCOP = (valor) => {
  if (valor === null || valor === undefined || valor === "") return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(valor));
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
  if (mins < 1)  return "Ahora mismo";
  if (mins < 60) return `Hace ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `Hace ${horas} h`;
  const dias = Math.floor(horas / 24);
  return `Hace ${dias} día${dias > 1 ? "s" : ""}`;
};

/**
 * Formatea un número con separador de miles.
 * Ej: 1270000 → "1.270.000"
 */
export const formatNumero = (valor) => {
  if (valor === null || valor === undefined) return "0";
  return new Intl.NumberFormat("es-CO").format(Number(valor));
};

/**
 * Formatea un porcentaje.
 * Ej: 0.1523 → "15,23%"
 */
export const formatPorcentaje = (valor, decimales = 1) => {
  if (valor === null || valor === undefined) return "0%";
  return `${Number(valor).toFixed(decimales)}%`;
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
 * Capitaliza la primera letra de un string.
 */
export const capitalizar = (texto) => {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
};

/**
 * Obtiene el número de semana ISO de una fecha.
 * Ej: new Date("2025-05-11") → 19
 */
export const getSemanaISO = (fecha = new Date()) => {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

/**
 * Obtiene el rango de fechas (inicio/fin) de una semana ISO.
 * Ej: getRangoSemana(19, 2025) → { inicio: "2025-05-05", fin: "2025-05-11" }
 */
export const getRangoSemana = (semana, anio = new Date().getFullYear()) => {
  const jan4 = new Date(anio, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const week1Start = new Date(jan4);
  week1Start.setDate(jan4.getDate() - dayOfWeek + 1);
  const start = new Date(week1Start);
  start.setDate(week1Start.getDate() + (semana - 1) * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    inicio: start.toISOString().split("T")[0],
    fin: end.toISOString().split("T")[0],
  };
};
