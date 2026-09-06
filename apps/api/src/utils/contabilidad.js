const AppError = require("../errors/AppError");

const MAX_OBSERVACION = 500;
const MAX_CONCEPTO = 200;

// Bogotá (Colombia) opera en UTC−5, sin horario de verano. Todos los "días de
// negocio" del módulo de Contabilidad se calculan con este calendario fijo,
// sin importar en qué zona horaria corra el servidor (en el contenedor Docker
// es UTC y va 5 horas adelante, lo que desplazaba los movimientos nocturnos
// al día siguiente). Cualquier calendario de Bogotá = instante UTC − 5 h.
const BOGOTA_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;

// Origen de un movimiento contable (Ingreso/Egreso). Permite distinguir los
// registros manuales de los automáticos generados por otros módulos y evitar
// (o alertar) duplicados:
//   - manual:                capturado a mano en Contabilidad.
//   - entrega:               cobro de una entrega confirmada (ingreso).
//   - abono-deuda-entrega:   abono a deuda anterior recibido por el entregador.
//   - abono-cliente:         abono a cuenta de un cliente (CxC).
//   - compra:                compra de mercancía pagada de contado.
//   - abono-proveedor:       pago realizado a un proveedor.
const ORIGENES = Object.freeze({
  MANUAL:           "manual",
  ENTREGA:          "entrega",
  ABONO_DEUDA_ENTREGA: "abono-deuda-entrega",
  ABONO_CLIENTE:    "abono-cliente",
  COMPRA:           "compra",
  ABONO_PROVEEDOR:  "abono-proveedor",
});

const sanitizarTexto = (valor, max = MAX_OBSERVACION) => {
  if (valor === null || valor === undefined) return "";
  return String(valor)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
};

const numero = (valor, nombre = "valor") => {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0) throw new AppError(`Ingresa un ${nombre} válido.`, 422);
  return n;
};

const numeroPositivo = (valor, nombre = "valor") => {
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) throw new AppError(`Ingresa un ${nombre} mayor a cero.`, 422);
  return n;
};

const semanaValida = (semana) => {
  if (!/^\d{1,2}$/.test(String(semana).trim())) throw new AppError("La semana debe ser un número entre 1 y 53.", 422);
  const n = Number(semana);
  if (!Number.isInteger(n) || n < 1 || n > 53) throw new AppError("La semana debe estar entre 1 y 53.", 422);
  return n;
};

const fechaValida = (fecha) => {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new AppError("La fecha es obligatoria y debe tener formato YYYY-MM-DD.", 422);
  const d = new Date(`${fecha}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new AppError("La fecha no es válida.", 422);
  return d;
};

// Devuelve un rango { gte, lt } para filtrar por un día completo (formato YYYY-MM-DD).
// Evita los falsos vacíos del filtro por igualdad sobre un DateTime.
const rangoDia = (fecha) => {
  const d = fechaValida(fecha);
  const fin = new Date(d);
  fin.setUTCDate(fin.getUTCDate() + 1);
  return { gte: d, lt: fin };
};

// Fecha calendario (año, mes 0-indexado, día) en Bogotá de un instante.
// Como Bogotá = UTC−5, el calendario de Bogotá se obtiene desplazando el
// instante cinco horas antes y leyendo sus campos UTC.
const fechaBogota = (fecha) => {
  if (fecha === null || fecha === undefined) return null;
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  const bog = new Date(d.getTime() - BOGOTA_UTC_OFFSET_MS);
  return { y: bog.getUTCFullYear(), m: bog.getUTCMonth(), d: bog.getUTCDate() };
};

// true si el instante es un "bucket" de día: medianoche UTC íntegra. Es el
// valor que `inicioDiaLocal` guarda como `fecha` de un movimiento de negocio,
// donde el calendario de Bogotá coincide con el de la fecha UTC (el instante
// "2026-09-06T00:00:00.000Z" representa el día comercial 06 de septiembre).
const esBucketDia = (d) =>
  d.getUTCHours() === 0 &&
  d.getUTCMinutes() === 0 &&
  d.getUTCSeconds() === 0 &&
  d.getUTCMilliseconds() === 0;

// Normaliza un instante a la medianoche UTC (bucket) del día calendario de
// Bogotá (UTC−5). Los movimientos automáticos se fechan así para que el "día"
// de negocio coincida con el calendario que ve el usuario, sin importar la TZ
// del servidor (en el contenedor Docker es UTC y va 5 horas adelante). Si ya
// recibe un bucket, lo devuelve tal cual (operación idempotente).
const inicioDiaLocal = (fecha = new Date()) => {
  if (fecha === null || fecha === undefined) return null;
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  if (esBucketDia(d)) return new Date(d);
  const f = fechaBogota(d);
  if (!f) return null;
  return new Date(Date.UTC(f.y, f.m, f.d));
};

// Semana de negocio de una fecha, con el mismo calendario del frontend
// (getSemanaISO): el 7 de septiembre es la SEMANA 1 de cada periodo.
// Ej: 2026-09-06 → 53 · 2026-09-07 → 1.
const semanaNegocio = (fecha) => {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return 1;
  const dia = esBucketDia(d) ? d : inicioDiaLocal(d);
  const y = dia.getUTCFullYear();
  const sep7Actual = new Date(Date.UTC(y, 8, 7));
  const base = dia < sep7Actual ? new Date(Date.UTC(y - 1, 8, 7)) : sep7Actual;
  return Math.floor((dia - base) / 86400000 / 7) + 1;
};

// Instante UTC correspondiente a la medianoche (inicio) del día comercial de
// Bogotá de una fecha "YYYY-MM-DD". El día calendario de Bogotá va de 05:00
// UTC a 05:00 UTC del día siguiente.
const inicioDiaBogotaISO = (fecha) => {
  const base = fechaValida(fecha);
  return new Date(base.getTime() + BOGOTA_UTC_OFFSET_MS);
};

// Rango [gte, lt) de instantes que caen dentro de los días comerciales de
// Bogotá de [desde, hasta]. Se usa para filtrar campos que guardan instantes
// reales (p. ej. fechaConfirmada de una entrega).
const rangoDiaBogota = (desde, hasta) => {
  const gte = inicioDiaBogotaISO(desde);
  const lt = new Date(inicioDiaBogotaISO(hasta).getTime() + 86400000);
  return { gte, lt };
};

// Rango de fechas ("YYYY-MM-DD") de una semana de negocio, con el mismo
// calendario del frontend (getRangoSemana): el 7 de septiembre es la SEMANA 1.
// El ancla del periodo se deriva del "hoy" calendario de Bogotá (inicioDiaLocal)
// para que no dependa de la zona horaria del servidor (contenedor en UTC —5 h).
const rangoSemana = (semana) => {
  const semanaNum = Number(semana) || 1;
  const hoy = inicioDiaLocal(new Date()) ?? new Date();
  const y = hoy.getUTCFullYear();
  const sep7Actual = new Date(Date.UTC(y, 8, 7));
  const base = hoy < sep7Actual ? new Date(Date.UTC(y - 1, 8, 7)) : sep7Actual;
  const iso = (d) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const inicio = new Date(base);
  inicio.setUTCDate(base.getUTCDate() + (semanaNum - 1) * 7);
  const fin = new Date(inicio);
  fin.setUTCDate(inicio.getUTCDate() + 6);
  return { inicio: iso(inicio), fin: iso(fin) };
};

// "YYYY-MM-DD" de la fecha calendario de Bogotá de un instante. Para un bucket
// de medianoche UTC (que ya representa un día de Bogotá) es la fecha UTC del
// propio bucket; para cualquier otro instante se calcula restando 5 horas.
// Permite agrupar en pantalla un movimiento con su día de negocio.
const fechaBogotaISO = (fecha) => {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  const f = esBucketDia(d)
    ? { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }
    : fechaBogota(d);
  return `${f.y}-${String(f.m + 1).padStart(2, "0")}-${String(f.d).padStart(2, "0")}`;
};

const ROLES_PERMITIDOS = new Set(["Admin", "Bodega", "AdminBogota", "Oficinista"]);

const calcularVariacion = async (prisma, sedeId, fecha, idExcluir = null) => {
  const anterior = await prisma.cartera.findFirst({
    where: {
      sedeId,
      fecha: { lt: fecha },
      ...(idExcluir ? { id: { not: idExcluir } } : {}),
    },
    orderBy: { fecha: "desc" },
    select: { saldoDia: true },
  });
  const saldoAnterior = anterior ? Number(anterior.saldoDia) : 0;
  return { saldoAnterior, variacion: 0 };
};

// ROL permitido para operar sobre un módulo de contabilidad.
function sedeEsPermitida(usuario) {
  return ROLES_PERMITIDOS.has(usuario?.rol);
}

// Filtro Prisma de sede para el usuario. Admin no firma por sede (acceso total).
function sedeWhere(usuario) {
  if (usuario && usuario.rol !== "Admin" && usuario.sedeId != null) {
    return { sedeId: usuario.sedeId };
  }
  return {};
}

module.exports = {
  MAX_OBSERVACION,
  MAX_CONCEPTO,
  ORIGENES,
  sanitizarTexto,
  numero,
  numeroPositivo,
  semanaValida,
  fechaValida,
  rangoDia,
  inicioDiaLocal,
  semanaNegocio,
  rangoSemana,
  inicioDiaBogotaISO,
  rangoDiaBogota,
  fechaBogotaISO,
  calcularVariacion,
  sedeEsPermitida,
  sedeWhere,
};
