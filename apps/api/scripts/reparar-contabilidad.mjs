// reparar-contabilidad.mjs
// Reparación única (idempotente) de los datos del módulo de Contabilidad para
// alinearlos con el calendario de Bogotá (UTC−5) y con la fuente unificada de
// movimientos (Ingresos/Egresos):
//
//   1. Re-anclaje de fechas/semanas: los movimientos automáticos generados
//      mientras el servidor corría en UTC quedaron fechados al día siguiente
//      cuando el cobro ocurría después de las 19:00 de Bogotá. Se recalcula su
//      `fecha`/`semana` desde su referencia real (fechaConfirmada de la
//      entrega, o creado_en del abono de cliente).
//
//   2. Ingresos faltantes: hay entregas confirmadas y cobradas que nunca
//      generaron su Ingreso (o abono a deuda) contable. Se crean los que no
//      existan, con la misma lógica y origen del servicio real.
//
// Por defecto SOLO MUESTRA el resumen (no modifica nada). Usa `--apply`
// para aplicar los cambios y `--detalle` para imprimir registro por registro.
//
// Uso:
//   pnpm.cmd --filter api exec node scripts/reparar-contabilidad.mjs [--apply] [--detalle]

import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

const API_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(API_DIR, ".env") });

if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL. Revisa apps/api/.env");
  process.exit(1);
}

const APPLY = process.argv.includes("--apply");
const DETALLE = process.argv.includes("--detalle");
const prisma = new PrismaClient();

// ---- Calendario de negocio de Bogotá (UTC−5, sin horario de verano) ----
// Misma lógica que apps/api/src/utils/contabilidad.js (idempotente y
// compatible con los buckets guardados en `ingresos.fecha`).
const BOGOTA_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;

const esBucketDia = (d) =>
  d.getUTCHours() === 0 &&
  d.getUTCMinutes() === 0 &&
  d.getUTCSeconds() === 0 &&
  d.getUTCMilliseconds() === 0;

const inicioDiaLocal = (instante) => {
  const d = new Date(instante);
  if (Number.isNaN(d.getTime())) return null;
  if (esBucketDia(d)) return d;
  const bog = new Date(d.getTime() - BOGOTA_UTC_OFFSET_MS);
  return new Date(Date.UTC(bog.getUTCFullYear(), bog.getUTCMonth(), bog.getUTCDate()));
};

const semanaNegocio = (dia) => {
  const y = dia.getUTCFullYear();
  const sep7 = new Date(Date.UTC(y, 8, 7));
  const base = dia < sep7 ? new Date(Date.UTC(y - 1, 8, 7)) : sep7;
  return Math.floor((dia - base) / 86400000 / 7) + 1;
};

const n = (v) => Number(v ?? 0);
const diaStr = (d) => (d ? d.toISOString().slice(0, 10) : null);

const evitaDuplicado = (origen, idReferencia) => `${origen}:${idReferencia}`;

const resumen = {
  reanclados: 0,
  sinReferencia: 0,
  entregasSinMovimiento: 0,
  abonosSinSede: 0,
  creadosEntrega: 0,
  creadosAbono: 0,
};

const ok = (mensaje) => console.log(`  ${mensaje}`);
const warn = (mensaje) => console.warn(`  [aviso] ${mensaje}`);

try {
  console.log(`Modo: ${APPLY ? "APLICAR cambios" : "PREVIEW (sin escribir)"}\n`);

  // ============ PASO 1: re-anclar fecha/semana de movimientos automáticos ============
  console.log("Paso 1 — Re-anclar fecha/semana de movimientos automáticos a Bogotá (UTC−5)");

  const automaticos = await prisma.ingreso.findMany({
    where: { origen: { in: ["entrega", "abono-deuda-entrega", "abono-cliente"] } },
    select: {
      id: true,
      fecha: true,
      semana: true,
      origen: true,
      idReferencia: true,
      fechaCreacion: true,
    },
  });

  const idsEntrega = automaticos
    .filter((i) => i.origen !== "abono-cliente" && i.idReferencia != null)
    .map((i) => i.idReferencia);
  const asignaciones = await prisma.asignacionEntrega.findMany({
    where: { id: { in: [...new Set(idsEntrega)] } },
    select: { id: true, fechaConfirmada: true, asignadoEn: true },
  });
  const mapaAsignacion = new Map(asignaciones.map((a) => [a.id, a]));

  for (const ingreso of automaticos) {
    let referencia = null;
    if (ingreso.origen === "abono-cliente") {
      referencia = ingreso.fechaCreacion;
    } else {
      const asignacion = mapaAsignacion.get(ingreso.idReferencia);
      referencia = asignacion?.fechaConfirmada ?? asignacion?.asignadoEn ?? null;
    }
    if (!referencia) {
      warn(`Ingreso #${ingreso.id} (${ingreso.origen}) sin referencia para re-anclar; se deja tal cual.`);
      resumen.sinReferencia += 1;
      continue;
    }

    const fechaNueva = inicioDiaLocal(referencia);
    const semanaNueva = semanaNegocio(fechaNueva);

    if (fechaNueva.getTime() === ingreso.fecha.getTime() && semanaNueva === ingreso.semana) continue;

    resumen.reanclados += 1;
    if (DETALLE) {
      console.log(
        `  #${ingreso.id} ${ingreso.origen} -> ${diaStr(ingreso.fecha)}/S${ingreso.semana} = ${diaStr(fechaNueva)}/S${semanaNueva}`,
      );
    }
    if (APPLY) {
      await prisma.ingreso.update({
        where: { id: ingreso.id },
        data: { fecha: fechaNueva, semana: semanaNueva },
      });
    }
  }
  console.log(`Movimientos automáticos re-anclados ${APPLY ? "" : "(se aplicarían) "}: ${resumen.reanclados}\n`);

  // ============ PASO 2: crear Ingresos faltantes de entregas confirmadas ============
  console.log("Paso 2 — Crear Ingresos faltantes de entregas confirmadas y cobradas");

  const existentes = await prisma.ingreso.findMany({
    where: { origen: { in: ["entrega", "abono-deuda-entrega"] } },
    select: { origen: true, idReferencia: true },
  });
  const clavesExistentes = new Set(existentes.map((i) => evitaDuplicado(i.origen, i.idReferencia)));

  const entregas = await prisma.asignacionEntrega.findMany({
    where: { estado: "Entregado", fechaConfirmada: { not: null } },
    select: {
      id: true,
      pedidoId: true,
      fechaConfirmada: true,
      asignadoEn: true,
      montoCobrado: true,
      montoEfectivo: true,
      montoTransferencia: true,
      abonoDeuda: true,
      metodoPago: true,
      pedido: {
        select: {
          sedeId: true,
          cliente: { select: { sedeId: true, nombre: true } },
        },
      },
    },
  });

  for (const entrega of entregas) {
    const monto = n(entrega.montoCobrado);
    const abono = n(entrega.abonoDeuda);
    const metodoPago = entrega.metodoPago;

    let efectivo = 0;
    let cuentas = 0;
    if (metodoPago === "Mixto") {
      efectivo = n(entrega.montoEfectivo);
      cuentas = n(entrega.montoTransferencia);
    } else if (metodoPago === "Transferencia") {
      cuentas = monto;
    } else if (metodoPago === "Efectivo" || metodoPago === "Parcial") {
      efectivo = monto;
    }

    if (efectivo + cuentas <= 0 && abono <= 0) continue;

    const sedeCobro = entrega.pedido?.cliente?.sedeId ?? entrega.pedido?.sedeId ?? null;
    const fechaMovimiento = inicioDiaLocal(entrega.fechaConfirmada ?? entrega.asignadoEn);
    const semana = semanaNegocio(fechaMovimiento);

    if (sedeCobro == null) {
      resumen.abonosSinSede += 1;
      warn(
        `Entrega #${entrega.id} (pedido #${entrega.pedidoId}): no hay sede (cliente y pedido sin sedeId) ` +
        `para registrar ${efectivo + cuentas > 0 ? "Ingreso" : "abono"} de ${n(efectivo + cuentas + abono)}.`,
      );
      continue;
    }

    const hayCobro = efectivo + cuentas > 0;
    const hayAbono = abono > 0;

    if (hayCobro && !clavesExistentes.has(evitaDuplicado("entrega", entrega.id))) {
      resumen.creadosEntrega += 1;
      if (DETALLE) {
        console.log(
          `  falta Ingreso 'entrega' de asignación #${entrega.id} (pedido #${entrega.pedidoId}, ` +
          `${n(efectivo + cuentas)} el ${diaStr(fechaMovimiento)})`,
        );
      }
      if (APPLY) {
        await prisma.ingreso.create({
          data: {
            fecha: fechaMovimiento,
            semana,
            sedeId: sedeCobro,
            efectivo,
            cuentas,
            total: efectivo + cuentas,
            origen: "entrega",
            idReferencia: entrega.id,
            observacion: `Cobro entrega pedido #${entrega.pedidoId} (asignación #${entrega.id})`,
          },
        });
      }
    } else if (hayCobro) {
      resumen.entregasSinMovimiento += 1;
    }

    if (hayAbono && !clavesExistentes.has(evitaDuplicado("abono-deuda-entrega", entrega.id))) {
      resumen.creadosAbono += 1;
      if (DETALLE) {
        console.log(
          `  falta Ingreso 'abono-deuda-entrega' de asignación #${entrega.id} (pedido #${entrega.pedidoId}, ` +
          `${abono} el ${diaStr(fechaMovimiento)})`,
        );
      }
      if (APPLY) {
        await prisma.ingreso.create({
          data: {
            fecha: fechaMovimiento,
            semana,
            sedeId: sedeCobro,
            efectivo: abono,
            cuentas: 0,
            total: abono,
            origen: "abono-deuda-entrega",
            idReferencia: entrega.id,
            observacion: `Abono a deuda anterior del cliente (asignación #${entrega.id})`,
          },
        });
      }
    }
  }
  console.log(
    `Entregas con Ingreso 'entrega' faltante: ${resumen.creadosEntrega} · ` +
    `abonos 'abono-deuda-entrega' faltantes: ${resumen.creadosAbono} · ` +
    `entregas ya con movimiento: ${resumen.entregasSinMovimiento} · deudas/cobros sin sede: ${resumen.abonosSinSede}`,
  );

  // Nota sobre abonos de cliente: el Ingreso 'abono-cliente' no tiene un
  // historial del que se pueda reconstruir los abonos históricos sin riesgo
  // de duplicar; los existentes ya quedaron re-anclados en el paso 1.
  console.log(
    "\nNota: los Abonos de cliente ('abono-cliente') solo se re-anclaron (paso 1); " +
    "no se recrean faltantes para evitar duplicados (no hay historial para reconstruirlos).\n",
  );

  console.log(
    APPLY
      ? "Aplicación completada. Verifica los reportes de Contabilidad."
      : "Preview terminado. Ejecuta con --apply para escribir los cambios.",
  );
} catch (err) {
  console.error("Error ejecutando la reparación:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}