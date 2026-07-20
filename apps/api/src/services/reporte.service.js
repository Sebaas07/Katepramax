const AppError = require("../errors/AppError");

function toNum(v) { return Number(v ?? 0); }

// FIX: siempre consulta el nombre real de la sede en BD
// Reglas de acceso (coherentes con injectSedeFilter en auth.middleware.js):
//   Admin               → ve todas las sedes, o puede filtrar por una en particular
//   Bodega / AdminBogota → solo su propia sede, sin excepción
async function getSedes(prisma, usuario, sedeIdFiltro) {
  if (usuario && usuario.rol !== "Admin") {
    const sede = await prisma.sede.findUnique({
      where:  { id: usuario.sedeId },
      select: { id: true, nombre: true },
    });
    return sede ? [sede] : [{ id: usuario.sedeId, nombre: `Sede ${usuario.sedeId}` }];
  }

  if (sedeIdFiltro) {
    const sede = await prisma.sede.findUnique({
      where:  { id: Number(sedeIdFiltro) },
      select: { id: true, nombre: true },
    });
    return sede ? [sede] : [];
  }

  return prisma.sede.findMany({ where: { activo: true }, select: { id: true, nombre: true } });
}

function sedeWhere(usuario, sedeIdFiltro) {
  if (usuario && usuario.rol !== "Admin" && usuario.sedeId != null) {
    return { sedeId: usuario.sedeId };
  }
  // Admin: acceso total, con filtro opcional de una sede específica.
  if (sedeIdFiltro) {
    return { sedeId: Number(sedeIdFiltro) };
  }
  return {};
}

async function arqueoSemanal(app, semana, usuario) {
  const prisma    = app.prisma;
  const sedes     = await getSedes(prisma, usuario);
  const whereSede = sedeWhere(usuario);

  const ingRows = await prisma.ingreso.groupBy({
    by:      ["sedeId"],
    where:   { semana, ...whereSede },
    _sum:    { efectivo: true, cuentas: true, total: true },
    orderBy: { sedeId: "asc" },
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

  const totalIngresos = {
    efectivo: ingresos.reduce((a, s) => a + s.efectivo, 0),
    cuentas:  ingresos.reduce((a, s) => a + s.cuentas,  0),
    total:    ingresos.reduce((a, s) => a + s.total,     0),
  };

  const egrRows = await prisma.egreso.groupBy({
    by:      ["sedeId"],
    where:   { semana, ...whereSede },
    _sum:    { total: true },
    orderBy: { sedeId: "asc" },
  });

  const aboRows = await prisma.abono.groupBy({
    by:      ["sedeId"],
    where:   { semana, ...whereSede },
    _sum:    { valorPagado: true },
    orderBy: { sedeId: "asc" },
  });

  const egresos = sedes.map((s) => {
    const ef = egrRows.find((r) => r.sedeId === s.id);
    const af = aboRows.find((r) => r.sedeId === s.id);
    const operativo   = toNum(ef?._sum.total);
    const proveedores = toNum(af?._sum.valorPagado);
    return {
      sede:         s.nombre,
      sedeId:       s.id,
      operativo,
      proveedores,
      totalEgresos: operativo + proveedores,
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

  const carteraWhere = usuario && usuario.rol !== "Admin" && usuario.sedeId != null
    ? { sedeId: usuario.sedeId }
    : {};
  const cartera = await prisma.cliente.aggregate({ where: carteraWhere, _sum: { saldoDeuda: true } });
  const totalCartera = toNum(cartera._sum.saldoDeuda);

  // FIX: campo correcto es "costoUnitario", no "costo"
  const invRows = await prisma.inventario.aggregate({
    where: { semana, ...whereSede },
    _sum:  { costoUnitario: true },
  });
  const costoInventario = toNum(invRows._sum.costoUnitario);

  return {
    semana,
    ingresos:       { porSede: ingresos,  totales: totalIngresos },
    egresos:        { porSede: egresos,   totales: totalEgresos  },
    saldoNeto:      { porSede: saldoNeto, total:   saldoNetoTotal },
    cartera:        totalCartera,
    costoInventario,
  };
}

async function panelGeneral(app, { fecha, sedeId } = {}, usuario) {
  const prisma  = app.prisma;
  const dia     = new Date(fecha);
  dia.setUTCHours(0, 0, 0, 0);
  const diaFin  = new Date(dia);
  diaFin.setUTCHours(23, 59, 59, 999);

  const sedes     = await getSedes(prisma, usuario, sedeId);
  const whereSede = sedeWhere(usuario, sedeId);

  const ingRows = await prisma.ingreso.groupBy({
    by:    ["sedeId"],
    where: { fecha: { gte: dia, lte: diaFin }, ...whereSede },
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
    where: { fecha: { gte: dia, lte: diaFin }, ...whereSede },
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
  };
}

// Cobros realizados por cada entregador en un rango de fechas.
// Se basa en AsignacionEntrega (montoCobrado) con estado "Entregado".
async function cobrosPorEntregador(app, { fechaInicio, fechaFin, sedeId } = {}, usuario) {
  const prisma = app.prisma;
  if (!fechaInicio || !fechaFin) {
    throw new AppError("fechaInicio y fechaFin son obligatorios.", 400);
  }

  const desde = new Date(fechaInicio);
  desde.setUTCHours(0, 0, 0, 0);
  const hasta = new Date(fechaFin);
  hasta.setUTCHours(23, 59, 59, 999);

  const whereSede = sedeWhere(usuario);
  const sedeFiltro = sedeId ? Number(sedeId) : whereSede.sedeId;

  const asignaciones = await prisma.asignacionEntrega.findMany({
    where: {
      estado: "Entregado",
      fechaConfirmada: { gte: desde, lte: hasta },
      pedido: sedeFiltro ? { sedeId: sedeFiltro } : undefined,
    },
    select: {
      montoCobrado: true,
      metodoPago: true,
      entregadorId: true,
      entregador: { select: { id: true, nombreCompleto: true } },
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
        efectivo: 0,
        cuentas: 0,
      });
    }
    const fila = porEntregador.get(key);
    const monto = toNum(a.montoCobrado);
    fila.pedidos += 1;
    fila.total += monto;
    if (a.metodoPago === "Efectivo") fila.efectivo += monto;
    if (a.metodoPago === "Transferencia") fila.cuentas += monto;
  }

  const detalle = Array.from(porEntregador.values()).sort((a, b) => b.total - a.total);

  return {
    fechaInicio,
    fechaFin,
    detalle,
    total: detalle.reduce((acc, f) => acc + f.total, 0),
    pedidos: detalle.reduce((acc, f) => acc + f.pedidos, 0),
  };
}

async function historialSemanal(app, { skip = 0, take = 20 } = {}, usuario) {
  const prisma    = app.prisma;
  const whereSede = sedeWhere(usuario);
  const filtroSede = whereSede.sedeId != null ? { sedeId: whereSede.sedeId } : {};

  // FIX: agrupar solo por semana (no por sedeId) para evitar duplicados al haber varias sedes.
  // Cuando no es Admin, filtroSede ya limita a la sede del usuario.
  const semanasIng = await prisma.ingreso.groupBy({
    by:    ["semana"],
    where: filtroSede,
    _sum:  { total: true, efectivo: true, cuentas: true },
    orderBy: { semana: "desc" },
  });
  const semanasEgr = await prisma.egreso.groupBy({
    by:    ["semana"],
    where: filtroSede,
    _sum:  { total: true },
    orderBy: { semana: "desc" },
  });
  const semanasAbo = await prisma.abono.groupBy({
    by:    ["semana"],
    where: filtroSede,
    _sum:  { valorPagado: true },
    orderBy: { semana: "desc" },
  });
  // FIX: campo correcto es "costoUnitario", no "costo"
  const semanasInv = await prisma.inventario.groupBy({
    by:    ["semana"],
    where: filtroSede,
    _sum:  { costoUnitario: true },
    orderBy: { semana: "desc" },
  });

  // Unión de todas las semanas con datos
  const todasSemanas = [
    ...new Set([
      ...semanasIng.map((r) => r.semana),
      ...semanasEgr.map((r) => r.semana),
      ...semanasAbo.map((r) => r.semana),
      ...semanasInv.map((r) => r.semana),
    ]),
  ].sort((a, b) => b - a);

  const total     = todasSemanas.length;
  const paginadas = todasSemanas.slice(skip, skip + take);

  const historial = paginadas.map((semana) => {
    const ing = semanasIng.find((r) => r.semana === semana);
    const egr = semanasEgr.find((r) => r.semana === semana);
    const abo = semanasAbo.find((r) => r.semana === semana);
    const inv = semanasInv.find((r) => r.semana === semana);

    const ingTotal = toNum(ing?._sum.total);
    const egrTotal = toNum(egr?._sum.total) + toNum(abo?._sum.valorPagado);

    return {
      semana,
      ingTotal,
      egrTotal,
      saldoNeto:        ingTotal - egrTotal,
      ingEfectivo:      toNum(ing?._sum.efectivo),
      ingCuentas:       toNum(ing?._sum.cuentas),
      deudaProveedores: toNum(abo?._sum.valorPagado),
      costoInventario:  toNum(inv?._sum.costoUnitario),
    };
  });

  return { total, skip, take, data: historial };
}

// Corte de caja: cuánto se recaudó (entregadores) vs. cuánto se gastó
// (egresos) en un rango de fechas. Sirve tanto para el corte del día
// (desde == hasta) como para quincena o mes (el rango lo arma el frontend).
async function corteCaja(app, { desde, hasta, sedeId } = {}, usuario) {
  const prisma = app.prisma;
  if (!desde || !hasta) {
    throw new AppError("desde y hasta son obligatorios.", 400);
  }

  const inicio = new Date(desde);
  inicio.setUTCHours(0, 0, 0, 0);
  const fin = new Date(hasta);
  fin.setUTCHours(23, 59, 59, 999);

  const whereSede = sedeWhere(usuario, sedeId);
  const wherePedidoSede = whereSede.sedeId ? { sedeId: whereSede.sedeId } : undefined;

  const entregas = await prisma.asignacionEntrega.findMany({
    where: {
      estado: "Entregado",
      fechaConfirmada: { gte: inicio, lte: fin },
      ...(wherePedidoSede ? { pedido: wherePedidoSede } : {}),
    },
    select: {
      montoCobrado: true,
      montoEfectivo: true,
      montoTransferencia: true,
      abonoDeuda: true,
      metodoPago: true,
      fechaConfirmada: true,
    },
  });

  let totalEfectivo = 0;
  let totalTransferencia = 0;
  let totalAbonos = 0;
  let sinClasificar = 0;
  const porDiaMap = new Map();

  const marcarDia = (fecha) => {
    const key = fecha.toISOString().slice(0, 10);
    if (!porDiaMap.has(key)) {
      porDiaMap.set(key, { fecha: key, recaudado: 0, egresos: 0 });
    }
    return porDiaMap.get(key);
  };

  for (const e of entregas) {
    const cobrado = toNum(e.montoCobrado);
    const abono = toNum(e.abonoDeuda);

    if (e.metodoPago === "Efectivo") totalEfectivo += cobrado;
    else if (e.metodoPago === "Transferencia") totalTransferencia += cobrado;
    else if (e.metodoPago === "Mixto") {
      totalEfectivo += toNum(e.montoEfectivo);
      totalTransferencia += toNum(e.montoTransferencia);
    } else {
      // Parcial / Credito: se cobró algo pero no sabemos por qué canal.
      sinClasificar += cobrado;
    }
    totalAbonos += abono;

    marcarDia(e.fechaConfirmada).recaudado += cobrado + abono;
  }

  const totalRecaudado = totalEfectivo + totalTransferencia + totalAbonos + sinClasificar;

  const egresos = await prisma.egreso.findMany({
    where: { fecha: { gte: inicio, lte: fin }, ...whereSede },
    select: { fecha: true, total: true, concepto: true },
  });

  let totalEgresos = 0;
  const porConceptoMap = new Map();
  for (const eg of egresos) {
    const total = toNum(eg.total);
    totalEgresos += total;
    marcarDia(eg.fecha).egresos += total;
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
      total: totalRecaudado,
      efectivo: totalEfectivo,
      transferencia: totalTransferencia,
      abonosDeuda: totalAbonos,
      sinClasificar,
      pedidosEntregados: entregas.length,
    },
    egresos: { total: totalEgresos, porConcepto },
    ganancia: totalRecaudado - totalEgresos,
    porDia,
  };
}

module.exports = {
  arqueoSemanal,
  panelGeneral,
  historialSemanal,
  cobrosPorEntregador,
  corteCaja,
};
