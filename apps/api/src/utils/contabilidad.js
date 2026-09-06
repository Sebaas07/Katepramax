const AppError = require("../errors/AppError");

const MAX_OBSERVACION = 500;
const MAX_CONCEPTO = 200;

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

// Normaliza un instante al inicio de su día en el calendario LOCAL del
// servidor. Los movimientos automáticos se fechan así para que el "día" de
// negocio coincida con el calendario local (mismo día que ve el usuario).
const inicioDiaLocal = (fecha = new Date()) => {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
};

// Semana de negocio de una fecha, con el mismo calendario del frontend
// (getSemanaISO): el 7 de septiembre es la SEMANA 1 de cada periodo.
// Ej: 2026-09-06 → 53 · 2026-09-07 → 1.
const semanaNegocio = (fecha) => {
  const dia = inicioDiaLocal(fecha);
  if (!dia) return 1;
  const sep7Actual = new Date(dia.getFullYear(), 8, 7);
  const base =
    dia < sep7Actual
      ? new Date(dia.getFullYear() - 1, 8, 7)
      : sep7Actual;
  return Math.floor((dia - base) / 86400000 / 7) + 1;
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
  calcularVariacion,
  sedeEsPermitida,
  sedeWhere,
};
