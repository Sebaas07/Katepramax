const AppError = require("../errors/AppError");
const { ORIGENES } = require("../utils/contabilidad");

function toNum(v) { return Number(v ?? 0); }

// FIX: siempre consulta el nombre real de la sede en BD
// Reglas de acceso (coherentes con injectSedeFilter en auth.middleware.js):
//   Admin               → ve todas las sedes, o puede filtrar por una en particular
//   Bodega / AdminBogota → solo su propia sede, sin excepción
/**
 * Sedes visibles para un usuario. Las oficinas (tipo Oficina) pertenecen a
 * una bodega (bodegaId); el set se resuelve en el auth middleware
 * (`usuario.sedesOperativas`) para que un Oficinista vea los datos de su
 * oficina y de la bodega que la alimenta, y una Bodega vea sus oficinas.
 *
 * `soloOficinas` permite restringir el resultado a sedes de tipo "Oficina"
 * (se usa en el arqueo semanal, que solo calcula con oficinas).
 */
async function getSedes(prisma, usuario, sedeIdFiltro, soloOficinas = false) {
  const reducir = (sedes) =>
    soloOficinas ? sedes.filter((s) => s.tipo === "Oficina") : sedes;

  if (usuario && usuario.rol !== "Admin") {
    const sedesIds = Array.isArray(usuario.sedesOperativas)
      ? usuario.sedesOperativas
      : [usuario.sedeId];
    const sedes = await prisma.sede.findMany({
      where: { id: { in: sedesIds } },
      select: { id: true, nombre: true, tipo: true },
    });
    if (sedes.length > 0) return reducir(sedes);
    return sedesIds.map((id) => ({ id, nombre: `Sede ${id}` }));
  }

  if (sedeIdFiltro) {
    const sede = await prisma.sede.findUnique({
      where:  { id: Number(sedeIdFiltro) },
      select: { id: true, nombre: true, tipo: true },
    });
    return sede ? reducir([sede]) : [];
  }

  const sedes = await prisma.sede.findMany({
    where: { activo: true },
    select: { id: true, nombre: true, tipo: true },
  });
  return reducir(sedes);
}

function sedeWhere(usuario, sedeIdFiltro) {
  if (usuario && usuario.rol !== "Admin" && usuario.sedeId != null) {
    const sedesIds = Array.isArray(usuario.sedesOperativas)
      ? usuario.sedesOperativas
      : [usuario.sedeId];
    // Con una sola sede queda `{ sedeId }` (compatible con el flujo previo);
    // con varias (bodega + oficinas) se usa `{ sedeId: { in } }`.
    return sedesIds.length === 1
      ? { sedeId: sedesIds[0] }
      : { sedeId: { in: sedesIds } };
  }
  // Admin: acceso total, con filtro opcional de una sede específica.
  if (sedeIdFiltro) {
    return { sedeId: Number(sedeIdFiltro) };
  }
  return {};
}

async function arqueoSemanal(app, semana, usuario) {
  const prisma    = app.prisma;
  const sedes     = await getSedes(prisma, usuario, undefined, true);
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

  // Los abonos a proveedores ahora son Egresos (origen abono-proveedor):
  // se desglosan para el arqueo sin duplicar el total de egresos.
  const aboRows = await prisma.egreso.groupBy({
    by:      ["sedeId"],
    where:   { semana, ...whereSede, origen: ORIGENES.ABONO_PROVEEDOR },
    _sum:    { total: true },
    orderBy: { sedeId: "asc" },
  });

  const egresos = sedes.map((s) => {
    const ef = egrRows.find((r) => r.sedeId === s.id);
    const af = aboRows.find((r) => r.sedeId === s.id);
    const egresoTotal   = toNum(ef?._sum.total);
    const proveedores   = toNum(af?._sum.total);
    const operativo     = egresoTotal - proveedores;
    return {
      sede:         s.nombre,
      sedeId:       s.id,
      operativo,
      proveedores,
      totalEgresos: egresoTotal,
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

  // FIX: el costo de inventario debe ser Σ (cantidad × costoUnitario), no Σ costoUnitario.
  const invMovs = await prisma.inventario.findMany({
    where: { semana, ...whereSede },
    select: { cantidadIngresada: true, costoUnitario: true },
  });
  const costoInventario = invMovs.reduce(
    (acc, m) => acc + toNum(m.cantidadIngresada) * toNum(m.costoUnitario),
    0,
  );

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

  const sedes     = await getSedes(prisma, usuario, sedeId, true);
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

  // ── KPIs para el dashboard ──────────────────────────────────────────────
  // Pedidos activos (Pendiente o Asignado)
  const pedidosPendientes = await prisma.pedido.count({
    where: { estado: { in: ["Pendiente", "Asignado"] }, ...whereSede },
  });

  // Entregas en ruta (la sede se filtra vía la relación con Pedido)
  const pedidoWhere = whereSede.sedeId !== undefined ? { sedeId: whereSede.sedeId } : undefined;
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

  const desde = new Date(fechaInicio);
  desde.setUTCHours(0, 0, 0, 0);
  const hasta = new Date(fechaFin);
  hasta.setUTCHours(23, 59, 59, 999);

  const whereSede = sedeWhere(usuario);
  const sedeFiltro = sedeId ? { sedeId: Number(sedeId) } : whereSede.sedeId ? { sedeId: whereSede.sedeId } : undefined;

  const asignaciones = await prisma.asignacionEntrega.findMany({
    where: {
      estado: "Entregado",
      fechaConfirmada: { gte: desde, lte: hasta },
      pedido: sedeFiltro,
    },
    select: {
      montoCobrado: true,
      abonoDeuda: true,
      metodoPago: true,
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
  cobrosPorEntregador,
  corteCaja,
};
