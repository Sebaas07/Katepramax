import { getSemanaISO, hoyISO } from "./formatters";

export const MAX_OBSERVACION = 500;
export const MAX_CONCEPTO = 200;
export const MAX_COMPROBANTE = 50;

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_FIELDS = ["efectivo", "cuentas", "total", "saldoDia", "valorAbono"];
const TEXT_FIELDS = ["observacion", "observaciones", "concepto"];

export const normalizarSemana = (valor) => {
  const numero = Number.parseInt(valor, 10);
  if (Number.isNaN(numero)) return "";
  return String(Math.min(53, Math.max(1, numero)));
};

const limpiarCaracteresPeligrosos = (valor) => {
  let limpio = String(valor).replace(/[<>]/g, "");
  for (let i = 0; i <= 0x1f; i += 1) {
    const char = String.fromCharCode(i);
    if (char !== "\t" && char !== "\n" && char !== "\r") {
      limpio = limpio.split(char).join("");
    }
  }
  return limpio.split("\x7F").join("");
};

export const sanitizarTexto = (valor, max = MAX_OBSERVACION) => {
  if (valor === null || valor === undefined) return "";
  return limpiarCaracteresPeligrosos(valor)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
};

// Sanitización durante el tipeo: elimina caracteres peligrosos pero
// conserva espacios y saltos de línea para que el usuario pueda escribir
// observaciones largas sin que se le borren los espacios.
export const sanitizarTextoInput = (valor, max = MAX_OBSERVACION) => {
  if (valor === null || valor === undefined) return "";
  return limpiarCaracteresPeligrosos(valor).slice(0, max);
};

export const parseNumero = (valor) => {
  if (valor === null || valor === undefined || valor === "") return NaN;
  const normalizado = String(valor)
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : NaN;
};

export const numeroPositivo = (valor) => {
  const numero = parseNumero(valor);
  // No se aplana hacia cero: los negativos deben propagarse para que la
  // validación (`> 0`) o el backend los rechacen. Solo se neutraliza el NaN.
  return Number.isNaN(numero) ? 0 : numero;
};

export const validarFechaFormulario = (fecha) => {
  if (!fecha) return "La fecha es obligatoria.";
  if (!FECHA_RE.test(fecha)) return "Ingresa una fecha válida.";
  if (fecha > hoyISO()) return "La fecha no puede ser futura.";
  return "";
};

export const validarFormularioContabilidad = ({ modalTipo, form }) => {
  const errores = {};
  const fechaError = validarFechaFormulario(form.fecha);
  if (fechaError) errores.fecha = fechaError;
  if (!form.sedeId) errores.sedeId = "Selecciona la sede.";

  if (modalTipo === "ingreso") {
    const efectivo = parseNumero(form.efectivo);
    const cuentas = parseNumero(form.cuentas);
    if ((!form.efectivo || efectivo <= 0) && (!form.cuentas || cuentas <= 0)) {
      errores.efectivo = "Ingresa al menos un valor en efectivo o cuentas.";
    }
  }

  if (modalTipo === "egreso") {
    if (!sanitizarTexto(form.concepto, MAX_CONCEPTO)) errores.concepto = "El concepto es obligatorio.";
    if (!form.total || parseNumero(form.total) <= 0) errores.total = "Ingresa un total mayor a cero.";
  }

  if (modalTipo === "cartera") {
    if (!form.saldoDia || parseNumero(form.saldoDia) <= 0) errores.saldoDia = "Ingresa un saldo mayor a cero.";
  }

  if (modalTipo === "abono") {
    if (!form.proveedorId) errores.proveedorId = "Selecciona el proveedor.";
    if (!form.valorAbono || parseNumero(form.valorAbono) <= 0) errores.valorAbono = "Ingresa un valor mayor a cero.";
  }

  return errores;
};

export const construirPayloadContabilidad = (modalTipo, form) => {
  const fecha = form.fecha;
  const semana = getSemanaISO(new Date(fecha));
  const sedeId = Number.parseInt(form.sedeId, 10);

  if (modalTipo === "ingreso") {
    const efectivo = numeroPositivo(form.efectivo);
    const cuentas = numeroPositivo(form.cuentas);
    const observacion = sanitizarTexto(form.observacion);
    return {
      fecha,
      semana,
      sedeId,
      efectivo,
      cuentas,
      total: efectivo + cuentas,
      observacion: observacion || undefined,
    };
  }

  if (modalTipo === "egreso") {
    return {
      fecha,
      semana,
      sedeId,
      concepto: sanitizarTexto(form.concepto, MAX_CONCEPTO),
      total: numeroPositivo(form.total, { requerido: true }),
      observacion: sanitizarTexto(form.observaciones) || undefined,
      dia: new Date(fecha).toLocaleDateString("es-CO", { weekday: "long" }).toUpperCase(),
    };
  }

  if (modalTipo === "cartera") {
    return {
      fecha,
      semana,
      sedeId,
      saldoDia: numeroPositivo(form.saldoDia, { requerido: true }),
    };
  }

  if (modalTipo === "abono") {
    return {
      fecha,
      semana,
      sedeId,
      proveedorId: Number.parseInt(form.proveedorId, 10),
      valorPagado: numeroPositivo(form.valorAbono, { requerido: true }),
      observacion: sanitizarTexto(form.observacion) || undefined,
      comprobante: sanitizarTexto(form.comprobante, MAX_COMPROBANTE) || undefined,
    };
  }

  return {};
};

export const normalizarNumeroInput = (valor) => {
  const raw = String(valor ?? "").replace(/[^\d,.-]/g, "");
  if (raw === "-" || raw === "") return "";
  const tieneComa = raw.includes(",");
  const tienePunto = raw.includes(".");
  if (tieneComa && tienePunto) {
    const sinSeparadores = raw.replace(/[,.]/g, "");
    const signo = raw.startsWith("-") ? "-" : "";
    const numero = sinSeparadores.slice(1);
    return `${signo}${numero}`;
  }
  return raw.replace(",", ".");
};

export const esCampoNumerico = (campo) => NUMERIC_FIELDS.includes(campo);
export const esCampoTexto = (campo) => TEXT_FIELDS.includes(campo);
