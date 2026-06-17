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
  const n = Number.parseInt(semana, 10);
  if (!Number.isInteger(n) || n < 1 || n > 53) throw new AppError("La semana debe estar entre 1 y 53.", 422);
  return n;
};

const fechaValida = (fecha) => {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new AppError("La fecha es obligatoria y debe tener formato YYYY-MM-DD.", 422);
  const d = new Date(`${fecha}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) throw new AppError("La fecha no es válida.", 422);
  return d;
};

const semanaDesdeFecha = (fecha) => {
  const d = new Date(fecha);
  const utc = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
};

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

module.exports = {
  MAX_OBSERVACION,
  MAX_CONCEPTO,
  sanitizarTexto,
  numero,
  numeroPositivo,
  semanaValida,
  fechaValida,
  semanaDesdeFecha,
  calcularVariacion,
};
