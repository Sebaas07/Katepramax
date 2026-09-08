const AppError = require("../errors/AppError");
const {
  ORIGENES,
  rangoDia,
  rangoDiaBogota,
  rangoSemana,
  fechaValida,
  fechaBogotaISO,
  resolverFamiliaSede,
} = require("../utils/contabilidad");

function toNum(v) { return Number(v ?? 0); }

// Reglas de acceso (coherentes con injectSedeFilter en auth.middleware.js):
//   Admin               → ve todas las sedes, o puede filtrar por una en particular
//   Bodega / Oficinista / AdminBogota → solo su propia sede (usuario.sedeId),
//   sin excepción. Coherente con el alcance del listado de movimientos de
//   contabilidad (ingresos/egresos y cierres muestran lo de la propia oficina).
/**
 * Sedes visibles para un usuario (para desplegar nombres reales de sede).
 * Los no-Admin ven únicamente su propia sede (`usuario.sedeId`); un Admin ve
 * todas las sedes activas o una en particular mediante `sedeIdFiltro`.
 *
 * `soloOficinas` permite restringir el resultado a sedes de tipo "Oficina"
 * (un modo legado que ya no usan los reportes: arqueo y panel incluyen todas
 * las sedes —oficinas y bodegas— igual que el corte de caja).
 */
async function getSedes(prisma, usuario, sedeIdFiltro, soloOficinas = false) {
  const reducir = (sedes) =>
    soloOficinas ? sedes.filter((s) => s.tipo === "Oficina") : sedes;

  if (usuario && usuario.rol !== "Admin") {
    const sedeId = usuario.sedeId;
    if (sedeId == null) return [];
    const sedes = await prisma.sede.findMany({
      where: { id: { in: [sedeId] } },
      select: { id: true, nombre: true, tipo: true },
    });
    if (sedes.length > 0) return reducir(sedes);
    return [{ id: sedeId, nombre: `Sede ${sedeId}` }];
  }

  if (sedeIdFiltro) {
    return reducir(await resolverFamiliaSede(prisma, sedeIdFiltro));
  }

  const sedes = await prisma.sede.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, tipo: true },
  });
  return reducir(sedes);
}

async function sedeWhere(prisma, usuario, sedeIdFiltro) {
  // No-Admin: solo su propia sede, ignorando cualquier filtro externo.
  if (usuario && usuario.rol !== "Admin" && usuario.sedeId != null) {
    return { sedeId: usuario.sedeId };
  }
  // Admin: acceso total, o filtrado por la familia (bodega + oficinas
  // ligadas) de la sede puntual elegida en el dashboard.
  if (sedeIdFiltro) {
    const familia = await resolverFamiliaSede(prisma, sedeIdFiltro);
    const ids = familia.map((s) => s.id);
    if (ids.length === 0) return { sedeId: Number(sedeIdFiltro) };
    return ids.length === 1 ? { sedeId: ids[0] } : { sedeId: { in: ids } };
  }
  return {};
}

// Arqueo/cierre semanal unificado. Ambos conceptos leen los MISMOS movimientos
// (ingresos/egresos) dentro del rango de fechas de la semana de negocio de
// Bogotá (medianoche UTC = día comercial; el campo `semana` ya no participa en
// la consulta), por lo que Cierre Semanal y Arqueo Semanal siempre coinciden.
// Además de los bloques por sede (ingresos/egresos/saldo neto) devuelve los
// datos del corte de caja de la semana (recaudo, egresos por concepto, ganancia
// y porDia) para alimentar el mismo ticket del Cierre Diario.
async function arqueoSemanal(app, { semana, sedeId } = {}, usuario) {
  const prisma = app.prisma;
  const semanaNum = Number(semana);
  if (!Number.isInteger(semanaNum) || semanaNum < 1 || semanaNum > 53) {
    throw new AppError("La semana debe estar entre 1 y 53.", 400);
  }

  const { inicio, fin } = rangoSemana(semanaNum);
  const { gte, lt } = { gte: fechaValida(inicio), lt: rangoDia(fin).lt };
  const whereFecha = { fecha: { gte, lt } };

  const sedes     = await getSedes(prisma, usuario, sedeId);
  const whereSede = await sedeWhere(prisma, usuario, sedeId);

  const ingRows = await prisma.ingreso.findMany({
    where: { ...whereFecha, ...whereSede },
    select: { sedeId: true, fecha: true, efectivo: true, cuentas: true, total: true, origen: true },
  });

  // Clasificación idéntica al corte de caja (corteCaja): los abonos a deuda se
  // separan; efectivo/transferencia solo consideran cobros, y total lo incluye todo.
  const esAbono = (o) =>
    o === ORIGENES.ABONO_DEUDA_ENTREGA || o === ORIGENES.ABONO_CLIENTE;

  const porSedeIng = new Map();
  const recaudo = {
    total: 0, efectivo: 0, transferencia: 0,
    abonosDeuda: 0, sinClasificar: 0, pedidosEntregados: 0,
  };
  const porDiaMap = new Map();
  const marcarDiaIngreso = (fecha, total) => {
    const key = fechaBogotaISO(fecha) ?? String(fecha).slice(0, 10);
    if (!porDiaMap.has(key)) {
      porDiaMap.set(key, { fecha: key, recaudado: 0, egresos: 0 });
    }
    porDiaMap.get(key).recaudado += total;
  };
  const marcarDiaEgreso = (fecha, total) => {
    const key = fechaBogotaISO(fecha) ?? String(fecha).slice(0, 10);
    if (!porDiaMap.has(key)) {
      porDiaMap.set(key, { fecha: key, recaudado: 0, egresos: 0 });
    }
    porDiaMap.get(key).egresos += total;
  };

  for (const i of ingRows) {
    const total = toNum(i.total);
    let fila = porSedeIng.get(i.sedeId);
    if (!fila) {
      fila = { sedeId: i.sedeId, efectivo: 0, transferencia: 0, abonos: 0, total: 0 };
      porSedeIng.set(i.sedeId, fila);
    }
    fila.total += total;
    recaudo.total += total;
    if (esAbono(i.origen)) {
      fila.abonos += total;
      recaudo.abonosDeuda += total;
    } else {
      fila.efectivo += toNum(i.efectivo);
      fila.transferencia += toNum(i.cuentas);
      recaudo.efectivo += toNum(i.efectivo);
      recaudo.transferencia += toNum(i.cuentas);
    }
    if (i.origen === ORIGENES.ENTREGA) recaudo.pedidosEntregados += 1;
    marcarDiaIngreso(i.fecha, total);
  }

  const ingresos = sedes.map((s) => {
    const f = porSedeIng.get(s.id);
    return {
      sede:         s.nombre,
      sedeId:       s.id,
      efectivo:     toNum(f?.efectivo),
      transferencia: toNum(f?.transferencia),
      abonos:       toNum(f?.abonos),
      total:        toNum(f?.total),
    };
  });

  const totalIngresos = {
    efectivo:      ingresos.reduce((a, s) => a + s.efectivo, 0),
    transferencia: ingresos.reduce((a, s) => a + s.transferencia, 0),
    abonos:        ingresos.reduce((a, s) => a + s.abonos, 0),
    total:         ingresos.reduce((a, s) => a + s.total, 0),
  };

  const egrRows = await prisma.egreso.findMany({
    where: { ...whereFecha, ...whereSede },
    select: { sedeId: true, fecha: true, total: true, concepto: true, origen: true },
  });

  const porSedeEgr = new Map();
  const porConceptoMap = new Map();
  let totalEgresosGlobal = 0;

  for (const eg of egrRows) {
    const total = toNum(eg.total);
    totalEgresosGlobal += total;
    let fila = porSedeEgr.get(eg.sedeId);
    if (!fila) {
      fila = { sedeId: eg.sedeId, operativo: 0, proveedores: 0, totalEgresos: 0 };
      porSedeEgr.set(eg.sedeId, fila);
    }
    fila.totalEgresos += total;
    // Los abonos a proveedores viven como Egresos (origen abono-proveedor):
    // se desglosan para el arqueo sin duplicar el total de egresos.
    if (eg.origen === ORIGENES.ABONO_PROVEEDOR) fila.proveedores += total;
    else fila.operativo += total;
    porConceptoMap.set(eg.concepto, (porConceptoMap.get(eg.concepto) ?? 0) + total);
    marcarDiaEgreso(eg.fecha, total);
  }

  const egresos = sedes.map((s) => {
    const f = porSedeEgr.get(s.id);
    const totalEgresos = toNum(f?.totalEgresos);
    const proveedores  = toNum(f?.proveedores);
    return {
      sede:         s.nombre,
      sedeId:       s.id,
      operativo:    totalEgresos - proveedores,
      proveedores,
      totalEgresos,
    };
  });

  const totalEgresos = {
    operativo:    egresos.reduce((a, s) => a + s.operativo,    0),
    proveedores:  egresos.reduce((a, s) => a + s.proveedores,  0),
    totalEgresos: egresos.reduce((a, s) => a + s.totalEgresos, 0),
  };

  const saldoNeto = sedes.map((s) => {
    const ing = ingresos.find((x) => x.sedeId === s.id);
    const egr = egresos.find((x)  => x.sedeId === s.id);
    return {
      sede:      s.nombre,
      sedeId:    s.id,
      ingresos:  ing?.total        ?? 0,
      egresos:   egr?.totalEgresos ?? 0,
      saldoNeto: (ing?.total ?? 0) - (egr?.totalEgresos ?? 0),
    };
  });

  const saldoNetoTotal = saldoNeto.reduce((a, s) => a + s.saldoNeto, 0);

  const porDia = Array.from(porDiaMap.values())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((d) => ({ ...d, ganancia: d.recaudado - d.egresos }));

  const porConcepto = Array.from(porConceptoMap.entries())
    .map(([concepto, total]) => ({ concepto, total }))
    .sort((a, b) => b.total - a.total);

  const cartera = await prisma.cliente.aggregate({ where: whereSede, _sum: { saldoDeuda: true } });
  const totalCartera = toNum(cartera._sum.saldoDeuda);

  // FIX: el costo de inventario debe ser Σ (cantidad × costoUnitario), no Σ costoUnitario.
  const invMovs = await prisma.inventario.findMany({
    where: { fecha: { gte, lt }, ...whereSede },
    select: { cantidadIngresada: true, costoUnitario: true },
  });
  const costoInventario = invMovs.reduce(
    (acc, m) => acc + toNum(m.cantidadIngresada) * toNum(m.costoUnitario),
    0,
  );

  return {
    semana:   semanaNum,
    desde:    inicio,
    hasta:    fin,
    ingresos: { porSede: ingresos,  totales: totalIngresos },
    egresos:  { porSede: egresos,   totales: totalEgresos, porConcepto },
    saldoNeto: { porSede: saldoNeto, total: saldoNetoTotal },
    recaudo,
    ganancia: recaudo.total - totalEgresosGlobal,
    porDia,
    cartera:        totalCartera,
    costoInventario,
  };
}

async function panelGeneral(app, { fecha, sedeId } = {}, usuario) {
  const prisma  = app.prisma;
  const { gte: dia, lt: diaFin } = rangoDia(fecha);

  const sedes     = await getSedes(prisma, usuario, sedeId);
  const whereSede = await sedeWhere(prisma, usuario, sedeId);

  const ingRows = await prisma.ingreso.groupBy({
    by:    ["sedeId"],
    where: { fecha: { gte: dia, lt: diaFin }, ...whereSede },
    _sum:  { efectivo: true, cuentas: true, total: true },
  });

  const ingresos = sedes.map((s) => {
    const f = ingRows.find((r) => r.sedeId === s.id);
    return {
      sede:     s.nombre,
      sedeId:   s.id,
      efectivo: toNum(f?._sum.efectivo),
      cuentas:  toNum(f?._sum.cuentas),
      total:    toNum(f?._sum.total),
    };
  });

  const egrRows = await prisma.egreso.groupBy({
    by:    ["sedeId"],
    where: { fecha: { gte: dia, lt: diaFin }, ...whereSede },
    _sum:  { total: true },
  });

  const egresos = sedes.map((s) => {
    const f = egrRows.find((r) => r.sedeId === s.id);
    return { sede: s.nombre, sedeId: s.id, total: toNum(f?._sum.total) };
  });

  // Los clientes sin sede asignada (creados antes de este campo) solo
  // aparecen en la vista "Todas" (sin filtro), no en una sede específica.
  const cartera = await prisma.cliente.aggregate({ where: whereSede, _sum: { saldoDeuda: true } });

  const stockWhere = whereSede;
  const stock = await prisma.stockSede.aggregate({ where: stockWhere, _sum: { stockActual: true } });

  // ── KPIs para el dashboard ──────────────────────────────────────────────
  // Pedidos activos (Pendiente o Asignado)
  const pedidosPendientes = await prisma.pedido.count({
    where: { estado: { in: ["Pendiente", "Asignado"] }, ...whereSede },
  });

  // Entregas en ruta (la sede se filtra vía la relación con Pedido)
  const pedidoWhere = Object.keys(whereSede).length > 0 ? whereSede : undefined;
  const entregasEnRuta = await prisma.asignacionEntrega.count({
    where: { estado: "EnRuta", ...(pedidoWhere ? { pedido: pedidoWhere } : {}) },
  });

  // Productos con stock bajo: activos, con stockMinimo > 0 y stockActual <= stockMinimo
  // (mismo criterio que el módulo de productos en el frontend).
  const stockBajoRows = (await prisma.stockSede.findMany({
    where: { ...whereSede, producto: { activo: true } },
    select: {
      stockActual: true,
      producto:    { select: { stockMinimo: true } },
    },
  })) ?? [];
  const alertasInventario = stockBajoRows.filter(
    (s) =>
      Number(s.producto?.stockMinimo) > 0 &&
      Number(s.stockActual) <= Number(s.producto?.stockMinimo),
  ).length;

  return {
    fecha,
    ingresos: {
      porSede:  ingresos,
      efectivo: ingresos.reduce((a, s) => a + s.efectivo, 0),
      cuentas:  ingresos.reduce((a, s) => a + s.cuentas,  0),
      total:    ingresos.reduce((a, s) => a + s.total,     0),
    },
    egresos: {
      porSede: egresos,
      total:   egresos.reduce((a, s) => a + s.total, 0),
    },
    cartera:            toNum(cartera._sum.saldoDeuda),
    totalStockUnidades: toNum(stock._sum.stockActual),
    ventasHoy:          ingresos.reduce((a, s) => a + s.total, 0),
    pedidosPendientes,
    entregasEnRuta,
    alertasInventario,
  };
}

// Cobros realizados por cada entregador en un rango de fechas.
// Se basa en AsignacionEntrega (montoCobrado) con estado "Entregado".
async function cobrosPorEntregador(app, { fechaInicio, fechaFin, sedeId } = {}, usuario) {
  const prisma = app.prisma;
  if (!fechaInicio || !fechaFin) {
    throw new AppError("fechaInicio y fechaFin son obligatorios.", 400);
  }
  if (fechaInicio > fechaFin) {
    throw new AppError("fechaInicio no puede ser posterior a fechaFin.", 400);
  }

  const { gte: desde, lt: hasta } = rangoDiaBogota(fechaInicio, fechaFin);

  const whereSede = await sedeWhere(prisma, usuario);
  const sedeFiltro = sedeId
    ? await sedeWhere(prisma, usuario, sedeId)
    : (whereSede.sedeId !== undefined ? whereSede : undefined);

  const asignaciones = await prisma.asignacionEntrega.findMany({
    where: {
      estado: "Entregado",
      fechaConfirmada: { gte: desde, lt: hasta },
      pedido: sedeFiltro,
    },
    select: {
      montoCobrado: true,
      abonoDeuda: true,
      metodoPago: true,
      montoEfectivo: true,
      montoTransferencia: true,
      entregadorId: true,
      entregador: { select: { id: true, nombreCompleto: true } },
      pedido: { select: { valorDomicilio: true } },
    },
  });

  const porEntregador = new Map();
  for (const a of asignaciones) {
    const key = a.entregadorId;
    if (!porEntregador.has(key)) {
      porEntregador.set(key, {
        entregadorId: key,
        entregador: a.entregador?.nombreCompleto ?? `Usuario ${key}`,
        pedidos: 0,
        total: 0,
        abonos: 0,
        efectivo: 0,
        cuentas: 0,
        valorDomicilio: 0,
      });
    }
    const fila = porEntregador.get(key);
    const monto = toNum(a.montoCobrado);
    const abono = toNum(a.abonoDeuda);
    fila.pedidos += 1;
    fila.total += monto;
    fila.abonos += abono;
    fila.valorDomicilio += toNum(a.pedido?.valorDomicilio);
    if (a.metodoPago === "Efectivo") fila.efectivo += monto;
    if (a.metodoPago === "Transferencia") fila.cuentas += monto;
    if (a.metodoPago === "Mixto") {
      fila.efectivo += toNum(a.montoEfectivo);
      fila.cuentas += toNum(a.montoTransferencia);
    }
  }

  const detalle = Array.from(porEntregador.values()).sort((a, b) => b.total - a.total);

  return {
    fechaInicio,
    fechaFin,
    detalle,
    total: detalle.reduce((acc, f) => acc + f.total, 0),
    totalAbonos: detalle.reduce((acc, f) => acc + f.abonos, 0),
    totalDomicilios: detalle.reduce((acc, f) => acc + f.valorDomicilio, 0),
    pedidos: detalle.reduce((acc, f) => acc + f.pedidos, 0),
  };
}

// Corte de caja: cuánto se recaudó (entregadores) vs. cuánto se gastó
// (egresos) en un rango de fechas. Sirve tanto para el corte del día
// (desde == hasta) como para quincena o mes (el rango lo arma el frontend).
// Cierre de caja unificado sobre la tabla de movimientos (ingresos/egresos),
// la misma fuente que ve el usuario en la pestaña Ingresos. Se agrupa por el
// día calendario de Bogotá (UTC−5) que el frontend muestra en pantalla.
async function corteCaja(app, { desde, hasta, sedeId } = {}, usuario) {
  const prisma = app.prisma;
  if (!desde || !hasta) {
    throw new AppError("desde y hasta son obligatorios.", 400);
  }

  // Rangos de los buckets de movimientos (medianoche UTC = día de Bogotá).
  const desdeDia = rangoDia(desde).gte;
  const hastaDia = rangoDia(hasta).lt;

  const whereSede = await sedeWhere(prisma, usuario, sedeId);
  const whereRangoFecha = { fecha: { gte: desdeDia, lt: hastaDia } };

  const ingresos = await prisma.ingreso.findMany({
    where: { ...whereRangoFecha, ...whereSede },
    select: { fecha: true, total: true, efectivo: true, cuentas: true, origen: true },
  });

  const egresos = await prisma.egreso.findMany({
    where: { ...whereRangoFecha, ...whereSede },
    select: { fecha: true, total: true, concepto: true },
  });

  let totalEfectivo = 0;
  let totalTransferencia = 0;
  let totalAbonos = 0;
  let totalIngresos = 0;
  let pedidosEntregados = 0;
  let totalEgresos = 0;
  const porDiaMap = new Map();

  const marcarDia = (fecha) => {
    const key = fechaBogotaISO(fecha) ?? String(fecha).slice(0, 10);
    if (!porDiaMap.has(key)) {
      porDiaMap.set(key, { fecha: key, recaudado: 0, egresos: 0 });
    }
    return porDiaMap.get(key);
  };

  for (const i of ingresos) {
    const total = toNum(i.total);
    const esAbono = i.origen === ORIGENES.ABONO_DEUDA_ENTREGA || i.origen === ORIGENES.ABONO_CLIENTE;
    if (esAbono) totalAbonos += total;
    else {
      totalEfectivo += toNum(i.efectivo);
      totalTransferencia += toNum(i.cuentas);
    }
    totalIngresos += total;
    if (i.origen === ORIGENES.ENTREGA) pedidosEntregados += 1;
    marcarDia(i.fecha).recaudado += total;
  }

  const porConceptoMap = new Map();
  for (const eg of egresos) {
    const total = toNum(eg.total);
    totalEgresos += total;
    marcarDia(eg.fecha, "egresos").egresos += total;
    porConceptoMap.set(eg.concepto, (porConceptoMap.get(eg.concepto) ?? 0) + total);
  }

  const porDia = Array.from(porDiaMap.values())
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((d) => ({ ...d, ganancia: d.recaudado - d.egresos }));

  const porConcepto = Array.from(porConceptoMap.entries())
    .map(([concepto, total]) => ({ concepto, total }))
    .sort((a, b) => b.total - a.total);

  return {
    desde,
    hasta,
    recaudo: {
      total: totalIngresos,
      efectivo: totalEfectivo,
      transferencia: totalTransferencia,
      abonosDeuda: totalAbonos,
      sinClasificar: 0,
      pedidosEntregados,
    },
    egresos: { total: totalEgresos, porConcepto },
    ganancia: totalIngresos - totalEgresos,
    porDia,
  };
}

module.exports = {
  arqueoSemanal,
  panelGeneral,
  cobrosPorEntregador,
  corteCaja,
};
