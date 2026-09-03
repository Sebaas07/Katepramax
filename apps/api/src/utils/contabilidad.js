const AppError = require("../errors/AppError");

const MAX_OBSERVACION = 500;
const MAX_CONCEPTO = 200;

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

const semanaDesdeFecha = (fecha) => {
  const d = new Date(fecha);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
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
  sanitizarTexto,
  numero,
  numeroPositivo,
  semanaValida,
  fechaValida,
  rangoDia,
  semanaDesdeFecha,
  calcularVariacion,
  sedeEsPermitida,
  sedeWhere,
};
