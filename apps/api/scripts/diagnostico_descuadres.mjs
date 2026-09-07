// diagnostico_descuadres.mjs
// Script de SOLO LECTURA (no modifica datos) que detecta descuadres contables
// en los datos históricos para orientar la conciliación manual:
//   1. Ingresos que parecen duplicados (manual y automático).
//   2. Abonos a proveedor sin su Egreso automático asociado (o viceversa).
//   3. Compras de contado que quedaron como Egreso vs. entradas sin Egreso.
//   4. Cartera manual vs. saldo real de los clientes.
//
// Uso:
//   pnpm.cmd --filter api exec node scripts/diagnostico_descuadres.mjs

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

const prisma = new PrismaClient();

const col = (titulo) => console.log(`\n=== ${titulo} ===`);
const n = (v) => Number(v ?? 0);

try {
  col("1. Ingresos duplicados (manual vs. entrega)");
  const manualesEntrega = await prisma.ingreso.findMany({
    where: { origen: "manual" },
    select: { id: true, fecha: true, sedeId: true, efectivo: true, cuentas: true, total: true, observacion: true },
    orderBy: { fecha: "asc" },
  });
  const posibles = manualesEntrega.filter((i) =>
    /entrega|asignaci|pedido/i.test(i.observacion ?? ""),
  );
  console.log(`Ingresos manuales con texto de cobro/entrega: ${posibles.length}`);
  for (const i of posibles.slice(0, 50)) {
    console.log(
      `  #${i.id} ${i.observacion} | total=${i.total} | sede=${i.sedeId} | ${i.fecha.toISOString().slice(0, 10)}`,
    );
  }

  col("2. Abonos a proveedor sin / con Egreso automático");
  const abonos = await prisma.abono.findMany({
    select: { id: true, fecha: true, sedeId: true, valorPagado: true },
    orderBy: { fecha: "asc" },
  });
  const egresosAbono = await prisma.egreso.findMany({
    where: { origen: "abono-proveedor" },
    select: { idReferencia: true, id: true, total: true },
  });
  const conEgreso = new Set(egresosAbono.map((e) => e.idReferencia));
  const sinEgreso = abonos.filter((a) => !conEgreso.has(a.id));
  const egresosHuérfanos = egresosAbono.filter(
    (e) => e.idReferencia != null && !abonos.some((a) => a.id === e.idReferencia),
  );
  console.log(`Abonos totales: ${abonos.length}`);
  console.log(`Abonos SIN su Egreso (previos al cambio): ${sinEgreso.length}`);
  for (const a of sinEgreso.slice(0, 30)) {
    console.log(
      `  abono #${a.id} valor=${a.valorPagado} ${a.fecha.toISOString().slice(0, 10)} sede=${a.sedeId}`,
    );
  }
  console.log(`Egresos "abono-proveedor" huérfanos (sin abono): ${egresosHuérfanos.length}`);

  col("3. Compras de contado vs. Egreso de compra");
  const entradas = await prisma.inventario.findMany({
    where: { tipo: "entrada" },
    select: { id: true, fecha: true, sedeId: true, cantidadIngresada: true, costoUnitario: true, deuda: true, proveedorId: true },
  });
  const egresosCompra = await prisma.egreso.findMany({
    where: { origen: "compra" },
    select: { idReferencia: true, id: true, total: true },
  });
  const compraPorEntrada = new Map(egresosCompra.map((e) => [e.idReferencia, e]));
  const importe = (e) =>
    Math.abs(n(e.cantidadIngresada)) * n(e.costoUnitario);
  const entradasContadoSinEgreso = entradas.filter(
    (e) => !(n(e.deuda) > 0) && importe(e) > 0 && !compraPorEntrada.has(e.id),
  );
  const egresosSinEntrada = egresosCompra.filter(
    (e) => e.idReferencia != null && !entradas.some((x) => x.id === e.idReferencia),
  );
  const montoContadoSinEgreso = entradasContadoSinEgreso.reduce(
    (acc, e) => acc + importe(e),
    0,
  );
  console.log(
    `Entradas de contado (deuda<=0) SIN Egreso de compra: ${entradasContadoSinEgreso.length}` +
    (entradasContadoSinEgreso.length ? ` | monto total ≈ ${montoContadoSinEgreso}` : ""),
  );
  for (const e of entradasContadoSinEgreso.slice(0, 30)) {
    console.log(
      `  entrada #${e.id} importe=${importe(e)} ${e.fecha.toISOString().slice(0, 10)} sede=${e.sedeId}`,
    );
  }
  console.log(`Egresos "compra" sin entrada asociada: ${egresosSinEntrada.length}`);

  col("4. Cartera manual vs. saldo real de clientes (por sede)");
  const [saldosClientes, carteraUltima] = await Promise.all([
    prisma.cliente.groupBy({
      by: ["sedeId"],
      _sum: { saldoDeuda: true },
    }),
    prisma.cartera.groupBy({
      by: ["sedeId"],
      _max: { fecha: true },
    }),
  ]);
  const mapaSaldo = Object.fromEntries(
    saldosClientes.map((c) => [c.sedeId, n(c._sum.saldoDeuda)]),
  );
  for (const c of carteraUltima) {
    const saldoCliente = mapaSaldo[c.sedeId] ?? 0;
    const ult = await prisma.cartera.findFirst({
      where: { sedeId: c.sedeId },
      orderBy: { fecha: "desc" },
      select: { fecha: true, saldoDia: true },
    });
    const dif = n(ult?.saldoDia) - saldoCliente;
    console.log(
      `sede=${c.sedeId} cartera_ult=${n(ult?.saldoDia)} (${ult?.fecha.toISOString().slice(0, 10)}) | suma saldos clientes=${saldoCliente} | diferencia=${dif}`,
    );
  }

  col("Resumen");
  console.log(`- Ingresos manuales que parecen duplicados de entrega: ${posibles.length}`);
  console.log(`- Abonos sin Egreso: ${sinEgreso.length}`);
  console.log(`- Entradas contado sin Egreso compra: ${entradasContadoSinEgreso.length}`);
  console.log("Finalizado (sin modificar ningún dato).");
} catch (err) {
  console.error("Error ejecutando el diagnóstico:", err);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}