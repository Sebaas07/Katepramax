const AppError = require("../errors/AppError");

function toNum(v) { return Number(v ?? 0); }

async function getSedes(prisma, usuario) {
  if (usuario && usuario.rol !== "Admin") {
    return [{ id: usuario.sedeId, nombre: `Sede ${usuario.sedeId}` }];
  }
  const rows = await prisma.sede.findMany({ where: { activo: true }, select: { id: true, nombre: true } });
  return rows;
}

function sedeWhere(usuario) {
  if (usuario && usuario.rol !== "Admin" && usuario.sedeId != null) {
    return { sedeId: usuario.sedeId };
  }
  return {};
}

async function arqueoSemanal(app, semana, usuario) {
  const prisma   = app.prisma;
  const sedes    = await getSedes(prisma, usuario);
  const mapaSede = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));
  const whereSede = sedeWhere(usuario);

  const ingRows = await prisma.ingreso.groupBy({
    by:    ["sedeId"],
    where: { semana, ...whereSede },
    _sum:  { efectivo: true, cuentas: true, total: true },
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
    by:    ["sedeId"],
    where: { semana, ...whereSede },
    _sum:  { total: true },
    orderBy: { sedeId: "asc" },
  });

  const aboRows = await prisma.abono.groupBy({
    by:    ["sedeId"],
    where: { semana, ...whereSede },
    _sum:  { valorPagado: true },
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
      ingresos:  ing?.total    ?? 0,
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

  const invRows = await prisma.inventario.aggregate({ where: { semana, ...whereSede }, _sum: { costo: true } });
  const costoInventario = toNum(invRows._sum.costo);

  return {
    semana,
    ingresos:     { porSede: ingresos,  totales: totalIngresos },
    egresos:      { porSede: egresos,   totales: totalEgresos  },
    saldoNeto:    { porSede: saldoNeto, total:   saldoNetoTotal },
    cartera:      totalCartera,
    costoInventario,
  };
}

async function panelGeneral(app, fecha, usuario) {
  const prisma = app.prisma;
  const dia    = new Date(fecha);
  dia.setUTCHours(0, 0, 0, 0);
  const diaFin = new Date(dia); diaFin.setUTCHours(23, 59, 59, 999);

  const sedes = await getSedes(prisma, usuario);
  const whereSede = sedeWhere(usuario);

  const ingRows = await prisma.ingreso.groupBy({
    by:    ["sedeId"],
    where: { fecha: { gte: dia, lte: diaFin }, ...whereSede },
    _sum:  { efectivo: true, cuentas: true, total: true },
  });

  const ingresos = sedes.map((s) => {
    const f = ingRows.find((r) => r.sedeId === s.id);
    return { sede: s.nombre, sedeId: s.id, efectivo: toNum(f?._sum.efectivo), cuentas: toNum(f?._sum.cuentas), total: toNum(f?._sum.total) };
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

  const carteraWhere = usuario && usuario.rol !== "Admin" && usuario.sedeId != null
    ? { sedeId: usuario.sedeId }
    : {};
  const cartera = await prisma.cliente.aggregate({ where: carteraWhere, _sum: { saldoDeuda: true } });

  const stockWhere = usuario && usuario.rol !== "Admin" && usuario.sedeId != null
    ? { sedeId: usuario.sedeId }
    : {};
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
    cartera:         toNum(cartera._sum.saldoDeuda),
    totalStockUnidades: toNum(stock._sum.stockActual),
  };
}

async function historialSemanal(app, { skip = 0, take = 20 } = {}, usuario) {
  const prisma = app.prisma;
  const whereSede = sedeWhere(usuario);

  const semanasIng = await prisma.ingreso.groupBy({
    by: ["semana", "sedeId"],
    where: whereSede.sedeId ? { sedeId: whereSede.sedeId } : {},
    _sum: { total: true, efectivo: true, cuentas: true },
  });
  const semanasEgr = await prisma.egreso.groupBy({
    by: ["semana", "sedeId"],
    where: whereSede.sedeId ? { sedeId: whereSede.sedeId } : {},
    _sum: { total: true },
  });
  const semanasAbo = await prisma.abono.groupBy({
    by: ["semana", "sedeId"],
    where: whereSede.sedeId ? { sedeId: whereSede.sedeId } : {},
    _sum: { valorPagado: true },
  });
  const semanasInv = await prisma.inventario.groupBy({
    by: ["semana", "sedeId"],
    where: whereSede.sedeId ? { sedeId: whereSede.sedeId } : {},
    _sum: { costo: true },
  });

  const todasSemanas = [...new Set([
    ...semanasIng.map((r) => r.semana),
    ...semanasEgr.map((r) => r.semana),
  ])].sort((a, b) => b - a);

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
      costoInventario:  toNum(inv?._sum.costo),
    };
  });

  return { total: todasSemanas.length, skip, take, data: historial };
}

module.exports = {
  arqueoSemanal,
  panelGeneral,
  historialSemanal,
};
