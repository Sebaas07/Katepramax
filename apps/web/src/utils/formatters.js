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

// Valores de fecha que representan un día-calendario (no un instante real):
// la API serializa los "buckets" de día de negocio como "YYYY-MM-DD" o como
// "YYYY-MM-DDT00:00:00.000Z" (medianoche UTC = día de Bogotá, UTC−5). Para
// esos valores hay que mostrar el año/mes/día tal cual, SIN pasarlos por la
// zona horaria del navegador (que en Bogotá los desplazaría un día atrás).
const RE_BUCKET = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.000)?Z$/;
const RE_FECHA_PURA = /^(\d{4})-(\d{2})-(\d{2})$/;

const fechaCalendario = (valor) => {
  if (typeof valor !== "string") return null;
  const m = RE_BUCKET.exec(valor) || RE_FECHA_PURA.exec(valor);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

/**
 * Devuelve el Date que debe mostrar un valor de fecha. Un valor tipo
 * día-calendario ("YYYY-MM-DD" o bucket "YYYY-MM-DDT00:00:00.000Z") se
 * interpreta como ese día a medianoche local (Bogotá); cualquier otro se
 * interpreta como instante y se devuelve tal cual (se renderiza en la TZ
 * local del navegador). Devuelve null si no es una fecha válida.
 */
export const fechaVisual = (valor) => {
  if (valor === null || valor === undefined) return null;
  const calendario = fechaCalendario(valor);
  if (calendario) return calendario;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Formatea fecha ISO a texto corto legible.
 * Ej: "2025-05-11T09:10:00" → "11 may 2025".
 * Los valores tipo día-calendario ("YYYY-MM-DD" o bucket de medianoche UTC)
 * se muestran como el día calendario que representan.
 */
export const formatFecha = (iso) => {
  const d = fechaVisual(iso);
  if (!d) return "—";
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/**
 * Fecha de hoy (YYYY-MM-DD) en el calendario local del usuario (Bogotá).
 * NO usa toISOString: en UTC−5 el día calendario local va de 05:00 a 05:00 UTC.
 */
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
 * Obtiene el número de semana de negocio de una fecha.
 * El calendario reinicia cada 7 de septiembre: ese día es la SEMANA 1.
 * Se usa el día calendario LOCAL (Bogotá), igual que en el backend.
 * Ej: new Date("2026-09-07") → 1 · new Date("2026-09-14") → 2
 */
export const getSemanaISO = (fecha = new Date()) => {
  const d = new Date(
    Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
  );
  // La semana 1 arranca el 7 de septiembre del periodo en curso (o del anterior
  // si la fecha aún no llega al reset del año).
  const sep7Actual = new Date(Date.UTC(d.getUTCFullYear(), 8, 7));
  const base =
    d < sep7Actual
      ? new Date(Date.UTC(d.getUTCFullYear() - 1, 8, 7))
      : sep7Actual;
  return Math.floor((d - base) / 86400000 / 7) + 1;
};

/**
 * Obtiene el rango de fechas (inicio/fin) de una semana de negocio.
 * La base es el 7 de septiembre más reciente (semana 1 de ese periodo).
 * Ej: getRangoSemana(1) → { inicio: "2026-09-07", fin: "2026-09-13" }
 */
export const getRangoSemana = (semana) => {
  const hoy = new Date();
  const sep7Anio = new Date(Date.UTC(hoy.getFullYear(), 8, 7));
  const base =
    hoy < sep7Anio
      ? new Date(Date.UTC(hoy.getFullYear() - 1, 8, 7))
      : sep7Anio;
  const start = new Date(base);
  start.setUTCDate(base.getUTCDate() + (semana - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return {
    inicio: start.toISOString().split("T")[0],
    fin: end.toISOString().split("T")[0],
  };
};

// formatNumero, formatPorcentaje y capitalizar están disponibles internamente
// si en el futuro se necesitan exportar, agregar el keyword export.
