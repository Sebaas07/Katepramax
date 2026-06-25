/**
 * Tests unitarios — asignacion.service.js + reporte.service.js
 */
const { prisma }    = require("./__mocks__/prisma");
const asignacionSvc = require("../src/services/asignacion.service");
const reporteSvc    = require("../src/services/reporte.service");

const appMock = { prisma };
const usuarioBodega = { id: 2, rol: "Bodega", sedeId: 1 };

// ═══════════════════════════════════════════════════════════════════════════════
// ASIGNACION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const svc = asignacionSvc(appMock);

const pedidoPendiente  = { id: 1, estado: "Pendiente", clienteId: 1, sedeId: 1 };
const entregadorActivo = { id: 3, nombreCompleto: "Carlos", rol: "Entregador", activo: true };
const asignacionMock = {
  id: 1, pedidoId: 1, entregadorId: 3, asignadoPorId: 2, estado: "Pendiente",
  montoCobrado: null, metodoPago: null, fechaConfirmada: null,
  observacionesEntrega: null, asignadoEn: new Date(),
  pedido: { id: 1, estado: "Asignado", sedeId: 1, observaciones: null,
            cliente: { id: 1, nombre: "Juan", telefono: null } },
  entregador: { id: 3, nombreCompleto: "Carlos", telefono: null },
  asignador:  { id: 2, nombreCompleto: "Bodega" },
};

describe("asignacionService.crear", () => {
  it("debería lanzar 404 si el pedido no existe", async () => {
    prisma.pedido = { findUnique: vi.fn().mockResolvedValue(null) };

    await expect(svc.crear({ pedidoId: 1, entregadorId: 3 }, 2, usuarioBodega)).rejects.toMatchObject({
      statusCode: 404, message: expect.stringMatching(/pedido/i),
    });
  });

  it("debería lanzar 400 si el pedido no está Pendiente", async () => {
    prisma.pedido = { findUnique: vi.fn().mockResolvedValue({ ...pedidoPendiente, estado: "Asignado" }) };

    await expect(svc.crear({ pedidoId: 1, entregadorId: 3 }, 2, usuarioBodega)).rejects.toMatchObject({
      statusCode: 400, message: expect.stringMatching(/pendiente/i),
    });
  });

  it("debería lanzar 404 si el entregador no existe", async () => {
    prisma.pedido = { findUnique: vi.fn().mockResolvedValue(pedidoPendiente) };
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(svc.crear({ pedidoId: 1, entregadorId: 99 }, 2, usuarioBodega)).rejects.toMatchObject({
      statusCode: 404, message: expect.stringMatching(/entregador/i),
    });
  });

  it("debería lanzar 400 si el usuario no tiene rol Entregador", async () => {
    prisma.pedido = { findUnique: vi.fn().mockResolvedValue(pedidoPendiente) };
    prisma.usuario.findUnique.mockResolvedValue({ ...entregadorActivo, rol: "Bodega" });

    await expect(svc.crear({ pedidoId: 1, entregadorId: 3 }, 2, usuarioBodega)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("debería lanzar 400 si el entregador está inactivo", async () => {
    prisma.pedido = { findUnique: vi.fn().mockResolvedValue(pedidoPendiente) };
    prisma.usuario.findUnique.mockResolvedValue({ ...entregadorActivo, activo: false });

    await expect(svc.crear({ pedidoId: 1, entregadorId: 3 }, 2, usuarioBodega)).rejects.toMatchObject({
      statusCode: 400, message: expect.stringMatching(/inactivo/i),
    });
  });

  it("debería ejecutar transacción y retornar la asignación con detalles", async () => {
    prisma.pedido    = { findUnique: vi.fn().mockResolvedValue(pedidoPendiente) };
    prisma.usuario.findUnique.mockResolvedValue(entregadorActivo);

    const createdInTx = { id: 1 };
    prisma.$transaction.mockImplementation(async (fn) => {
      const result = await fn({
        asignacionEntrega: { create: vi.fn().mockResolvedValue(createdInTx) },
        pedido:            { update: vi.fn() },
      });
      return createdInTx; // el service hace: const asignacion = await $transaction(fn)
    });
    prisma.asignacionEntrega.findUnique.mockResolvedValue(asignacionMock);

    const result = await svc.crear({ pedidoId: 1, entregadorId: 3 }, 2, usuarioBodega);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.id).toBe(1);
  });
});

describe("asignacionService.obtenerPorId", () => {
  it("debería retornar la asignación si existe", async () => {
    prisma.asignacionEntrega.findUnique.mockResolvedValue(asignacionMock);

    const result = await svc.obtenerPorId(1, usuarioBodega);

    expect(result.id).toBe(1);
  });

  it("debería lanzar 404 si no existe", async () => {
    prisma.asignacionEntrega.findUnique.mockResolvedValue(null);

    await expect(svc.obtenerPorId(999, usuarioBodega)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("asignacionService.actualizarEstado", () => {
  it("debería lanzar 404 si la asignación no existe", async () => {
    prisma.asignacionEntrega.findUnique.mockResolvedValue(null);

    await expect(svc.actualizarEstado(999, { nuevoEstado: "EnRuta" }, 3, "Entregador"))
      .rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería lanzar 403 si Entregador intenta actualizar asignación ajena", async () => {
    prisma.asignacionEntrega.findUnique.mockResolvedValue({ ...asignacionMock, entregadorId: 99 });

    await expect(svc.actualizarEstado(1, { nuevoEstado: "EnRuta" }, 3, "Entregador"))
      .rejects.toMatchObject({ statusCode: 403 });
  });

  it("debería lanzar 400 para transición inválida (Entregado→EnRuta)", async () => {
    prisma.asignacionEntrega.findUnique.mockResolvedValue({ ...asignacionMock, estado: "Entregado" });

    await expect(svc.actualizarEstado(1, { nuevoEstado: "EnRuta" }, 3, "Entregador"))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it("debería lanzar 400 al confirmar Entregado sin montoCobrado", async () => {
    prisma.asignacionEntrega.findUnique.mockResolvedValue({ ...asignacionMock, estado: "EnRuta" });

    await expect(
      svc.actualizarEstado(1, { nuevoEstado: "Entregado", metodoPago: "Efectivo" }, 3, "Entregador"),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/monto/i) });
  });

  it("debería lanzar 400 al confirmar Entregado sin metodoPago", async () => {
    prisma.asignacionEntrega.findUnique.mockResolvedValue({ ...asignacionMock, estado: "EnRuta" });

    await expect(
      svc.actualizarEstado(1, { nuevoEstado: "Entregado", montoCobrado: 50000 }, 3, "Entregador"),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/metodo/i) });
  });

  it("debería usar repo.update para EnRuta sin transacción", async () => {
    prisma.asignacionEntrega.findUnique.mockResolvedValue(asignacionMock); // estado: Pendiente
    prisma.asignacionEntrega.update.mockResolvedValue({ ...asignacionMock, estado: "EnRuta" });

    await svc.actualizarEstado(1, { nuevoEstado: "EnRuta" }, 3, "Entregador");

    expect(prisma.asignacionEntrega.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ estado: "EnRuta" }) }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("debería ejecutar transacción al confirmar Entregado y reducir deuda", async () => {
    prisma.asignacionEntrega.findUnique
      .mockResolvedValueOnce({ ...asignacionMock, estado: "EnRuta" })
      .mockResolvedValueOnce({ ...asignacionMock, estado: "Entregado" });

    const txAsig   = vi.fn();
    const txPedido = vi.fn();
    const txCliente = vi.fn();

    prisma.$transaction.mockImplementation(async (fn) => {
      await fn({
        asignacionEntrega: { update: txAsig },
        pedido:            { update: txPedido },
        cliente:           { update: txCliente },
      });
    });

    await svc.actualizarEstado(
      1,
      { nuevoEstado: "Entregado", montoCobrado: 50000, metodoPago: "Efectivo" },
      3, "Entregador",
    );

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(txCliente).toHaveBeenCalledWith(
      expect.objectContaining({ data: { saldoDeuda: { decrement: 50000 } } }),
    );
  });

  it("debería devolver el pedido a Pendiente cuando el estado es Fallido", async () => {
    prisma.asignacionEntrega.findUnique
      .mockResolvedValueOnce({ ...asignacionMock, estado: "EnRuta" })
      .mockResolvedValueOnce({ ...asignacionMock, estado: "Fallido" });

    const txAsig   = vi.fn();
    const txPedido = vi.fn();
    prisma.$transaction.mockImplementation(async (fn) => {
      await fn({ asignacionEntrega: { update: txAsig }, pedido: { update: txPedido } });
    });

    await svc.actualizarEstado(1, { nuevoEstado: "Fallido" }, 3, "Entregador");

    expect(txPedido).toHaveBeenCalledWith(
      expect.objectContaining({ data: { estado: "Pendiente" } }),
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPORTE SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const sedes = [
  { id: 1, nombre: "Bogotá",        activo: true },
  { id: 2, nombre: "Villavicencio", activo: true },
];

function mockArqueoBase() {
  prisma.sede.findMany.mockResolvedValue(sedes);
  prisma.ingreso = {
    groupBy: vi.fn().mockResolvedValue([
      { sedeId: 1, _sum: { efectivo: 300000, cuentas: 100000, total: 400000 } },
    ]),
  };
  prisma.egreso = {
    groupBy: vi.fn().mockResolvedValue([
      { sedeId: 1, _sum: { total: 50000 } },
    ]),
  };
  prisma.abono = {
    groupBy: vi.fn().mockResolvedValue([
      { sedeId: 1, _sum: { valorPagado: 20000 } },
    ]),
  };
  prisma.cliente = {
    ...prisma.cliente,
    aggregate: vi.fn().mockResolvedValue({ _sum: { saldoDeuda: 500000 } }),
  };
  prisma.inventario = {
    groupBy:   vi.fn().mockResolvedValue([]),
    aggregate: vi.fn().mockResolvedValue({ _sum: { costoUnitario: 150000 } }),
  };
}

describe("reporteService.arqueoSemanal", () => {
  it("debería calcular saldoNeto.total correctamente", async () => {
    mockArqueoBase();

    const result = await reporteSvc.arqueoSemanal(appMock, 18);

    // ingresos=400000, egresos=(50000+20000)=70000, saldo=330000
    expect(result.saldoNeto.total).toBe(330000);
  });

  it("debería incluir sede sin datos con valores en cero", async () => {
    mockArqueoBase();
    // sede 2 no tiene datos en ningún groupBy

    const result = await reporteSvc.arqueoSemanal(appMock, 18);

    const sede2ing = result.ingresos.porSede.find((s) => s.sedeId === 2);
    expect(sede2ing.total).toBe(0);
    expect(sede2ing.efectivo).toBe(0);
  });

  it("debería retornar la cartera del aggregate de clientes", async () => {
    mockArqueoBase();

    const result = await reporteSvc.arqueoSemanal(appMock, 18);

    expect(result.cartera).toBe(500000);
  });

  it("debería retornar costoInventario del aggregate de inventario", async () => {
    mockArqueoBase();

    const result = await reporteSvc.arqueoSemanal(appMock, 18);

    expect(result.costoInventario).toBe(150000);
  });

  it("debería incluir el número de semana en la respuesta", async () => {
    mockArqueoBase();

    const result = await reporteSvc.arqueoSemanal(appMock, 18);

    expect(result.semana).toBe(18);
  });
});

describe("reporteService.panelGeneral", () => {
  it("debería calcular ingresos totales del día sumando todas las sedes", async () => {
    prisma.sede.findMany.mockResolvedValue(sedes);
    prisma.ingreso = {
      groupBy: vi.fn().mockResolvedValue([
        { sedeId: 1, _sum: { efectivo: 200000, cuentas: 50000, total: 250000 } },
        { sedeId: 2, _sum: { efectivo: 100000, cuentas: 0,     total: 100000 } },
      ]),
    };
    prisma.egreso = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.cliente = { ...prisma.cliente, aggregate: vi.fn().mockResolvedValue({ _sum: { saldoDeuda: 800000 } }) };
    prisma.stockSede = { ...prisma.stockSede, aggregate: vi.fn().mockResolvedValue({ _sum: { stockActual: 500 } }) };

    const result = await reporteSvc.panelGeneral(appMock, "2026-05-05");

    expect(result.ingresos.total).toBe(350000);
    expect(result.ingresos.efectivo).toBe(300000);
    expect(result.cartera).toBe(800000);
    expect(result.totalStockUnidades).toBe(500);
    expect(result.fecha).toBe("2026-05-05");
  });

  it("debería retornar ceros cuando no hay datos en el día", async () => {
    prisma.sede.findMany.mockResolvedValue(sedes);
    prisma.ingreso  = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.egreso   = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.cliente  = { ...prisma.cliente, aggregate: vi.fn().mockResolvedValue({ _sum: { saldoDeuda: null } }) };
    prisma.stockSede = { ...prisma.stockSede, aggregate: vi.fn().mockResolvedValue({ _sum: { stockActual: null } }) };

    const result = await reporteSvc.panelGeneral(appMock, "2026-05-05");

    expect(result.ingresos.total).toBe(0);
    expect(result.egresos.total).toBe(0);
    expect(result.cartera).toBe(0);
    expect(result.totalStockUnidades).toBe(0);
  });
});

describe("reporteService.historialSemanal", () => {
  it("debería calcular saldoNeto por semana correctamente", async () => {
    prisma.ingreso    = { groupBy: vi.fn().mockResolvedValue([
      { semana: 18, _sum: { total: 400000, efectivo: 300000, cuentas: 100000 } },
    ]) };
    prisma.egreso     = { groupBy: vi.fn().mockResolvedValue([
      { semana: 18, _sum: { total: 50000 } },
    ]) };
    prisma.abono      = { groupBy: vi.fn().mockResolvedValue([
      { semana: 18, _sum: { valorPagado: 20000 } },
    ]) };
    prisma.inventario = { groupBy: vi.fn().mockResolvedValue([
      { semana: 18, _sum: { costoUnitario: 150000 } },
    ]) };

    const result = await reporteSvc.historialSemanal(appMock);

    // saldoNeto = ingTotal(400000) - egrTotal(50000+20000=70000) = 330000
    expect(result.data[0].saldoNeto).toBe(330000);
    expect(result.data[0].costoInventario).toBe(150000);
    expect(result.total).toBe(1);
  });

  it("debería ordenar semanas de más reciente a más antigua", async () => {
    prisma.ingreso    = { groupBy: vi.fn().mockResolvedValue([
      { semana: 17, _sum: { total: 100000, efectivo: 100000, cuentas: 0 } },
      { semana: 20, _sum: { total: 300000, efectivo: 300000, cuentas: 0 } },
      { semana: 18, _sum: { total: 200000, efectivo: 200000, cuentas: 0 } },
    ]) };
    prisma.egreso     = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.abono      = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.inventario = { groupBy: vi.fn().mockResolvedValue([]) };

    const result = await reporteSvc.historialSemanal(appMock);

    expect(result.data[0].semana).toBe(20);
    expect(result.data[1].semana).toBe(18);
    expect(result.data[2].semana).toBe(17);
  });

  it("debería respetar skip y take", async () => {
    prisma.ingreso    = { groupBy: vi.fn().mockResolvedValue([
      { semana: 20, _sum: { total: 100000, efectivo: 100000, cuentas: 0 } },
      { semana: 19, _sum: { total: 200000, efectivo: 200000, cuentas: 0 } },
      { semana: 18, _sum: { total: 300000, efectivo: 300000, cuentas: 0 } },
    ]) };
    prisma.egreso     = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.abono      = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.inventario = { groupBy: vi.fn().mockResolvedValue([]) };

    const result = await reporteSvc.historialSemanal(appMock, { skip: 1, take: 1 });

    // skip=1 salta semana 20, take=1 devuelve solo semana 19
    expect(result.data).toHaveLength(1);
    expect(result.data[0].semana).toBe(19);
    expect(result.total).toBe(3); // total de semanas sin paginar
  });

  it("debería incluir semanas de egresos aunque no tengan ingresos", async () => {
    prisma.ingreso    = { groupBy: vi.fn().mockResolvedValue([
      { semana: 18, _sum: { total: 400000, efectivo: 300000, cuentas: 100000 } },
    ]) };
    prisma.egreso     = { groupBy: vi.fn().mockResolvedValue([
      { semana: 18, _sum: { total: 50000 } },
      { semana: 17, _sum: { total: 30000 } }, // semana sin ingresos
    ]) };
    prisma.abono      = { groupBy: vi.fn().mockResolvedValue([]) };
    prisma.inventario = { groupBy: vi.fn().mockResolvedValue([]) };

    const result = await reporteSvc.historialSemanal(appMock);

    expect(result.total).toBe(2);
    const semana17 = result.data.find((r) => r.semana === 17);
    expect(semana17.ingTotal).toBe(0);
    expect(semana17.egrTotal).toBe(30000);
    expect(semana17.saldoNeto).toBe(-30000);
  });
});
