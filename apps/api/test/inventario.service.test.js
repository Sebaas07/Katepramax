/**
 * Tests unitarios — inventario.service.js
 */
const { prisma } = require("./__mocks__/prisma");
const inventarioService = require("../src/services/inventario.service");

const appMock = { prisma };

// ── Datos de prueba ───────────────────────────────────────────────────────────

const sedeMock = { id: 1, nombre: "Sede Principal" };

const productoMock = {
  codigo: 1,
  descripcion: "Cemento Gris 50kg",
  precioCosto: 18000,
  activo: true,
};

const inventarioMock = {
  id: 1,
  fecha: new Date("2026-06-02"),
  semana: 23,
  sedeId: 1,
  productoId: 1,
  cantidadIngresada: 10,
  costoUnitario: 18000,
  tipo: "entrada",
  sede: { id: 1, nombre: "Sede Principal" },
  producto: {
    codigo: 1,
    descripcion: "Cemento Gris 50kg",
    precioCosto: 18000,
  },
};

const usuarioAdmin = { id: 1, rol: "Admin", sedeId: 1 };
const usuarioBodega = { id: 2, rol: "Bodega", sedeId: 1 };

// ── registrar ─────────────────────────────────────────────────────────────────

describe("inventarioService.registrar", () => {
  it("debería lanzar AppError 404 si la sede no existe", async () => {
    prisma.sede.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.registrar(
        appMock,
        {
          sedeId: 999,
          productoId: 1,
          cantidadIngresada: 10,
          fecha: "2026-06-02",
          semana: 23,
        },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/sede/i),
    });
  });

  it("debería lanzar AppError 404 si el producto no existe", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.registrar(
        appMock,
        {
          sedeId: 1,
          productoId: 999,
          cantidadIngresada: 10,
          fecha: "2026-06-02",
          semana: 23,
        },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/producto/i),
    });
  });

  it("debería lanzar AppError 422 si el producto está inactivo", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue({
      ...productoMock,
      activo: false,
    });

    await expect(
      inventarioService.registrar(
        appMock,
        {
          sedeId: 1,
          productoId: 1,
          cantidadIngresada: 10,
          fecha: "2026-06-02",
          semana: 23,
        },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringMatching(/inactivo/i),
    });
  });

  it("debería lanzar AppError 422 si salida deja stock negativo", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    // stock actual = 3, quiere sacar 10
    prisma.stockSede.findUnique.mockResolvedValue({ stockActual: 3 });

    await expect(
      inventarioService.registrar(
        appMock,
        {
          sedeId: 1,
          productoId: 1,
          cantidadIngresada: 10,
          tipo: "salida",
          fecha: "2026-06-02",
          semana: 23,
        },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringMatching(/stock insuficiente/i),
    });
  });

  it("debería normalizar la fecha a medianoche UTC", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.create.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.registrar(
      appMock,
      {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
      },
      usuarioAdmin,
    );

    // FIX: service usa repo.crear → prisma.inventario.create (no upsert)
    const callArg = prisma.inventario.create.mock.calls[0][0];
    const fecha = callArg.data.fecha;
    expect(fecha.getUTCHours()).toBe(0);
    expect(fecha.getUTCMinutes()).toBe(0);
    expect(fecha.getUTCSeconds()).toBe(0);
  });

  it("debería usar precioCosto del producto como costoUnitario si no se pasa", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock); // precioCosto: 18000
    prisma.inventario.create.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.registrar(
      appMock,
      {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 5,
        fecha: "2026-06-02",
        semana: 23,
      },
      usuarioAdmin,
    );

    // FIX: campo es costoUnitario, no costo
    const callData = prisma.inventario.create.mock.calls[0][0].data;
    expect(callData.costoUnitario).toBe(18000);
  });

  it("debería respetar el costoUnitario si se pasa explícitamente", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.create.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.registrar(
      appMock,
      {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 5,
        fecha: "2026-06-02",
        semana: 23,
        costoUnitario: 50000,
      },
      usuarioAdmin,
    );

    const callData = prisma.inventario.create.mock.calls[0][0].data;
    expect(callData.costoUnitario).toBe(50000);
  });

  it("debería guardar cantidadIngresada negativa para tipo salida", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.stockSede.findUnique.mockResolvedValue({ stockActual: 20 });
    prisma.inventario.create.mockResolvedValue({
      ...inventarioMock,
      cantidadIngresada: -5,
    });
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.registrar(
      appMock,
      {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 5,
        tipo: "salida",
        fecha: "2026-06-02",
        semana: 23,
      },
      usuarioAdmin,
    );

    const callData = prisma.inventario.create.mock.calls[0][0].data;
    expect(callData.cantidadIngresada).toBe(-5);
  });

  it("debería hacer upsert del stockSede después de registrar", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.create.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.registrar(
      appMock,
      {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
      },
      usuarioAdmin,
    );

    expect(prisma.stockSede.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sedeId_productoId: { sedeId: 1, productoId: 1 } },
        update: { stockActual: { increment: 10 } },
        create: { sedeId: 1, productoId: 1, stockActual: 10 },
      }),
    );
  });

  it("debería crear el Egreso de compra para una entrada de contado", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.create.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});
    prisma.egreso.create.mockResolvedValue({ id: 9 });

    await inventarioService.registrar(
      appMock,
      {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
      },
      usuarioAdmin,
    );

    expect(prisma.egreso.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        origen: "compra",
        idReferencia: 1, // id del movimiento creado
        sedeId: 1,
        total: 180000, // 10 * precioCosto 18000
      }),
      include: expect.anything(),
    });
  });

  it("debería NO crear Egreso de compra si la entrada tiene deuda pendiente", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.create.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});
    prisma.egreso.create.mockClear();

    await inventarioService.registrar(
      appMock,
      {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
        deuda: 50000,
      },
      usuarioAdmin,
    );

    expect(prisma.egreso.create).not.toHaveBeenCalled();
  });

  it("debería lanzar AppError 403 si usuario Entregador intenta registrar", async () => {
    await expect(
      inventarioService.registrar(
        appMock,
        {
          sedeId: 1,
          productoId: 1,
          cantidadIngresada: 5,
          fecha: "2026-06-02",
          semana: 23,
        },
        { id: 3, rol: "Entregador", sedeId: 1 },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("debería lanzar AppError 404 si el proveedor no existe", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.registrar(
        appMock,
        {
          sedeId: 1,
          productoId: 1,
          cantidadIngresada: 10,
          proveedorId: 3,
          fecha: "2026-06-02",
          semana: 23,
        },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/proveedor/i),
    });
  });

  it("debería lanzar AppError 422 si el proveedor está inactivo", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.proveedor.findUnique.mockResolvedValue({ id: 3, nombre: "Cemex", activo: false });

    await expect(
      inventarioService.registrar(
        appMock,
        {
          sedeId: 1,
          productoId: 1,
          cantidadIngresada: 10,
          proveedorId: 3,
          fecha: "2026-06-02",
          semana: 23,
        },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringMatching(/inactivo/i),
    });
  });

  it("debería guardar proveedorId y deuda cuando se envían", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.proveedor.findUnique.mockResolvedValue({ id: 3, nombre: "Cemex", activo: true });
    prisma.inventario.create.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.registrar(
      appMock,
      {
        sedeId: 1,
        productoId: 1,
        cantidadIngresada: 10,
        proveedorId: 3,
        deuda: 120000,
        fecha: "2026-06-02",
        semana: 23,
      },
      usuarioAdmin,
    );

    const callData = prisma.inventario.create.mock.calls[0][0].data;
    expect(callData.proveedorId).toBe(3);
    expect(callData.deuda).toBe(120000);
  });

  it("debería lanzar AppError 400 si la deuda es negativa", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);

    await expect(
      inventarioService.registrar(
        appMock,
        {
          sedeId: 1,
          productoId: 1,
          cantidadIngresada: 10,
          proveedorId: 3,
          deuda: -5000,
          fecha: "2026-06-02",
          semana: 23,
        },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/deuda/i),
    });
  });
});

// ── obtenerLista ──────────────────────────────────────────────────────────────

describe("inventarioService.obtenerLista", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioService.obtenerLista(appMock, {}, usuarioAdmin);

    expect(prisma.inventario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería convertir semana a número", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioService.obtenerLista(
      appMock,
      { semana: "23" },
      usuarioAdmin,
    );

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.semana).toBe(23);
  });

  it("Bodega solo ve su propia sede aunque pase sedeId diferente", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioService.obtenerLista(
      appMock,
      { sedeId: "99" },
      usuarioBodega,
    );

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    // filtro de sede debe ser el del usuario, no el del query
    expect(callWhere.sedeId).toBe(1);
  });
});

// ── obtenerPorId ──────────────────────────────────────────────────────────────

describe("inventarioService.obtenerPorId", () => {
  it("debería retornar el registro si existe", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock);

    const result = await inventarioService.obtenerPorId(
      appMock,
      1,
      usuarioAdmin,
    );

    expect(result.id).toBe(1);
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.inventario.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.obtenerPorId(appMock, 999, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería lanzar AppError 403 si Bodega intenta ver registro de otra sede", async () => {
    prisma.inventario.findUnique.mockResolvedValue({
      ...inventarioMock,
      sedeId: 99,
    });

    await expect(
      inventarioService.obtenerPorId(appMock, 1, usuarioBodega), // sedeId=1, registro.sedeId=99
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── editar ────────────────────────────────────────────────────────────────────

describe("inventarioService.editar", () => {
  it("debería lanzar AppError 404 si el registro no existe", async () => {
    prisma.inventario.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.editar(
        appMock,
        999,
        { cantidadIngresada: 15 },
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería ajustar stockSede con el delta correcto al aumentar cantidadIngresada", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock); // cantidadIngresada: 10, tipo: entrada
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      cantidadIngresada: 15,
    });
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.editar(
      appMock,
      1,
      { cantidadIngresada: 15 },
      usuarioAdmin,
    );

    // deltaNuevo=15, deltaAnterior=10 → ajuste=+5
    expect(prisma.stockSede.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { stockActual: { increment: 5 } } }),
    );
  });

  it("debería aplicar delta negativo si la cantidad disminuye", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock); // cantidadIngresada: 10
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      cantidadIngresada: 6,
    });
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.editar(
      appMock,
      1,
      { cantidadIngresada: 6 },
      usuarioAdmin,
    );

    // deltaNuevo=6, deltaAnterior=10 → ajuste=-4
    expect(prisma.stockSede.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { stockActual: { increment: -4 } } }),
    );
  });

  it("debería recalcular stock si cambia el tipo de entrada a salida", async () => {
    // NOTA: el schema de edición (editarInventario) solo permite
    // cantidadIngresada y costoUnitario — no permite cambiar `tipo`.
    // Antes había código que recalculaba el delta al cambiar de tipo,
    // pero era inalcanzable (dead code) y se eliminó.
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock);
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      cantidadIngresada: 6,
      tipo: "salida",
    });
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.editar(
      appMock,
      1,
      { cantidadIngresada: 6 },
      usuarioAdmin,
    );

    // deltaNuevo=6, deltaAnterior=10 → ajuste=-4
    expect(prisma.stockSede.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { stockActual: { increment: -4 } } }),
    );
  });

  it("no debería tocar stockSede si solo cambia costoUnitario", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock);
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      costoUnitario: 20000,
    });

    await inventarioService.editar(
      appMock,
      1,
      { costoUnitario: 20000 },
      usuarioAdmin,
    );

    expect(prisma.stockSede.upsert).not.toHaveBeenCalled();
  });
});

// ── borrar ────────────────────────────────────────────────────────────────────

describe("inventarioService.borrar", () => {
  it("debería lanzar AppError 404 si el registro no existe", async () => {
    prisma.inventario.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.borrar(appMock, 999, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("debería lanzar 422 si borrar una entrada dejaría stock negativo", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock); // cantidadIngresada: 10
    prisma.stockSede.findUnique.mockResolvedValue({ stockActual: 5 }); // solo 5 disponibles

    await expect(
      inventarioService.borrar(appMock, 1, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringMatching(/negativo/i),
    });
  });

  it("debería eliminar el registro y decrementar el stock dentro de una transacción", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock); // cantidadIngresada: 10
    prisma.stockSede.findUnique.mockResolvedValue({ stockActual: 20 }); // suficiente
    prisma.inventario.delete.mockResolvedValue(inventarioMock);
    prisma.stockSede.update.mockResolvedValue({});

    await inventarioService.borrar(appMock, 1, usuarioAdmin);

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.inventario.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(prisma.stockSede.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sedeId_productoId: { sedeId: 1, productoId: 1 } },
        data: { stockActual: { decrement: 10 } },
      }),
    );
  });
});

// ── resumenSemanal ────────────────────────────────────────────────────────────

describe("inventarioService.resumenSemanal", () => {
  it("debería mapear sedeId y productoId a nombres legibles", async () => {
    prisma.sede.findMany.mockResolvedValue([sedeMock]);
    prisma.inventario.groupBy.mockResolvedValue([
      {
        sedeId: 1,
        productoId: 1,
        _sum: { cantidadIngresada: 20, costoUnitario: 18000 },
      },
    ]);
    prisma.producto.findMany.mockResolvedValue([
      { codigo: 1, descripcion: "Cemento Gris 50kg" },
    ]);

    const result = await inventarioService.resumenSemanal(
      appMock,
      23,
      usuarioAdmin,
    );

    expect(result).toHaveLength(1);
    expect(result[0].sede).toBe("Sede Principal");
    expect(result[0].sedeId).toBe(1);
    expect(result[0].producto).toBe("Cemento Gris 50kg");
    expect(result[0].productoId).toBe(1);
    expect(result[0].cantidad).toBe(20);
    expect(result[0].costoUnitario).toBe(18000);
  });

  it("debería retornar array vacío para sedes sin movimientos en la semana", async () => {
    prisma.sede.findMany.mockResolvedValue([
      sedeMock,
      { id: 2, nombre: "Sede Norte" },
    ]);
    prisma.inventario.groupBy.mockResolvedValue([
      {
        sedeId: 1,
        productoId: 1,
        _sum: { cantidadIngresada: 5, costoUnitario: 18000 },
      },
    ]);
    prisma.producto.findMany.mockResolvedValue([
      { codigo: 1, descripcion: "Cemento" },
    ]);

    const result = await inventarioService.resumenSemanal(
      appMock,
      23,
      usuarioAdmin,
    );

    expect(result).toHaveLength(1);
    expect(result[0].sedeId).toBe(1);
    expect(result[0].productoId).toBe(1);
    expect(result[0].cantidad).toBe(5);
    expect(result[0].producto).toBe("Cemento");

    const sedeNorte = result.find((r) => r.sedeId === 2);
    expect(sedeNorte).toBeUndefined();
  });
});

// ── resumenDeudaProveedores ───────────────────────────────────────────────────

describe("inventarioService.resumenDeudaProveedores", () => {
  it("debería restar lo abonado a la deuda registrada", async () => {
    prisma.inventario.groupBy.mockResolvedValue([
      { proveedorId: 3, _sum: { deuda: 120000 } },
    ]);
    prisma.abono.groupBy.mockResolvedValue([
      { proveedorId: 3, _sum: { valorPagado: 45000 } },
    ]);
    prisma.proveedor.findMany.mockResolvedValue([
      { id: 3, nombre: "Cemex" },
    ]);

    const result = await inventarioService.resumenDeudaProveedores(
      appMock,
      {},
      usuarioAdmin,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      proveedor: "Cemex",
      proveedorId: 3,
      deudaPendiente: 120000,
      totalAbonado: 45000,
      saldoPendiente: 75000,
    });
  });

  it("debería forzar la sede del usuario para Bodega", async () => {
    prisma.inventario.groupBy.mockResolvedValue([]);
    prisma.abono.groupBy.mockResolvedValue([]);
    prisma.proveedor.findMany.mockResolvedValue([]);

    await inventarioService.resumenDeudaProveedores(
      appMock,
      { sedeId: 99 },
      usuarioBodega, // sedeId: 1
    );

    const callWhere = prisma.inventario.groupBy.mock.calls[0][0].where;
    const abonoWhere = prisma.abono.groupBy.mock.calls[0][0].where;
    expect(callWhere.sedeId).toBe(1);
    expect(abonoWhere.sedeId).toBe(1);
  });

  it("no debería permitir saldo negativo (sobreabono)", async () => {
    prisma.inventario.groupBy.mockResolvedValue([
      { proveedorId: 3, _sum: { deuda: 10000 } },
    ]);
    prisma.abono.groupBy.mockResolvedValue([
      { proveedorId: 3, _sum: { valorPagado: 30000 } },
    ]);
    prisma.proveedor.findMany.mockResolvedValue([{ id: 3, nombre: "Cemex" }]);

    const result = await inventarioService.resumenDeudaProveedores(
      appMock,
      {},
      usuarioAdmin,
    );

    expect(result[0].saldoPendiente).toBe(0);
  });

  it("debería lanzar AppError 403 si el rol no tiene permisos", async () => {
    await expect(
      inventarioService.resumenDeudaProveedores(
        appMock,
        {},
        { id: 3, rol: "Entregador", sedeId: 1 },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ── historialProveedor ────────────────────────────────────────────────────────

describe("inventarioService.historialProveedor", () => {
  const proveedorMock = { id: 3, nombre: "Cemex", activo: true };

  const entradasMock = [
    {
      id: 1,
      fecha: new Date("2026-05-10"),
      semana: 20,
      sedeId: 1,
      productoId: 1,
      cantidadIngresada: 10,
      costoUnitario: 18000,
      tipo: "entrada",
      deuda: 120000,
      nota: null,
      creadoEn: new Date("2026-05-10"),
      sede: { id: 1, nombre: "Sede Principal" },
      producto: { codigo: 1, descripcion: "Cemento Gris 50kg", precioCosto: 18000 },
      proveedor: { id: 3, nombre: "Cemex" },
    },
    {
      id: 2,
      fecha: new Date("2026-05-12"),
      semana: 20,
      sedeId: 1,
      productoId: 2,
      cantidadIngresada: 5,
      costoUnitario: 20000,
      tipo: "entrada",
      deuda: null,
      nota: "Pagada de contado",
      creadoEn: new Date("2026-05-12"),
      sede: { id: 1, nombre: "Sede Principal" },
      producto: { codigo: 2, descripcion: "Hierro 3/8", precioCosto: 20000 },
      proveedor: { id: 3, nombre: "Cemex" },
    },
  ];

  it("debería lanzar AppError 403 si el rol no tiene permisos", async () => {
    await expect(
      inventarioService.historialProveedor(
        appMock,
        { proveedorId: 3 },
        {},
        { id: 3, rol: "Entregador", sedeId: 1 },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("debería lanzar AppError 400 si el proveedorId no es válido", async () => {
    await expect(
      inventarioService.historialProveedor(
        appMock,
        { proveedorId: "abc" },
        {},
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("debería lanzar AppError 404 si el proveedor no existe", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.historialProveedor(
        appMock,
        { proveedorId: 999 },
        {},
        usuarioAdmin,
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería calcular totales por entrada y totalizar el saldo del proveedor", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.inventario.findMany.mockResolvedValue(entradasMock);
    prisma.inventario.groupBy.mockResolvedValue([
      { proveedorId: 3, _sum: { deuda: 170000 } },
    ]);
    prisma.abono.groupBy.mockResolvedValue([
      { proveedorId: 3, _sum: { valorPagado: 45000 } },
    ]);

    const result = await inventarioService.historialProveedor(
      appMock,
      { proveedorId: 3 },
      {},
      usuarioAdmin,
    );

    expect(result.proveedor).toEqual({
      id: 3,
      nombre: "Cemex",
      activo: true,
    });
    expect(result.resumen.periodo).toEqual({
      totalEntradas: 2,
      montoTotal: 280000, // 10*18000 + 5*20000
      deudaRegistrada: 120000, // 120000 + 0
    });
    expect(result.resumen.global).toEqual({
      deudaRegistrada: 170000,
      totalAbonado: 45000,
      saldoPendiente: 125000,
    });

    expect(result.entradas).toHaveLength(2);
    expect(result.entradas[0]).toMatchObject({
      id: 1,
      total: 180000,
      deuda: 120000,
      estado: "pendiente",
    });
    expect(result.entradas[1]).toMatchObject({
      id: 2,
      total: 100000,
      deuda: null,
      estado: "pagado",
    });
  });

  it("debería marcar las entradas como pagadas si el saldo global es 0", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.inventario.findMany.mockResolvedValue(entradasMock);
    prisma.inventario.groupBy.mockResolvedValue([
      { proveedorId: 3, _sum: { deuda: 120000 } },
    ]);
    prisma.abono.groupBy.mockResolvedValue([
      { proveedorId: 3, _sum: { valorPagado: 120000 } },
    ]);

    const result = await inventarioService.historialProveedor(
      appMock,
      { proveedorId: 3 },
      {},
      usuarioAdmin,
    );

    expect(result.resumen.global.saldoPendiente).toBe(0);
    expect(result.entradas[0].estado).toBe("pagado");
  });

  it("debería filtrar por rango de fechas (desde/hasta)", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.inventario.findMany.mockResolvedValue(entradasMock);
    prisma.inventario.groupBy.mockResolvedValue([]);
    prisma.abono.groupBy.mockResolvedValue([]);

    await inventarioService.historialProveedor(
      appMock,
      { proveedorId: 3 },
      { desde: "2026-05-01", hasta: "2026-05-31" },
      usuarioAdmin,
    );

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.proveedorId).toBe(3);
    expect(callWhere.tipo).toBe("entrada");
    expect(callWhere.fecha.gte).toEqual(new Date("2026-05-01T00:00:00.000Z"));
    expect(callWhere.fecha.lt).toEqual(new Date("2026-06-01T00:00:00.000Z"));
  });

  it("no debería agregar filtro de fecha si no se pasan desde/hasta", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.inventario.findMany.mockResolvedValue(entradasMock);
    prisma.inventario.groupBy.mockResolvedValue([]);
    prisma.abono.groupBy.mockResolvedValue([]);

    await inventarioService.historialProveedor(
      appMock,
      { proveedorId: 3 },
      {},
      usuarioAdmin,
    );

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.fecha).toBeUndefined();
  });

  it("Bodega solo ve entradas de su propia sede aunque pase sedeId", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.inventario.findMany.mockResolvedValue(entradasMock);
    prisma.inventario.groupBy.mockResolvedValue([]);
    prisma.abono.groupBy.mockResolvedValue([]);

    await inventarioService.historialProveedor(
      appMock,
      { proveedorId: 3 },
      { sedeId: 99 },
      usuarioBodega, // sedeId: 1
    );

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.sedeId).toBe(1);
  });

  it("Admin puede filtrar por sedeId", async () => {
    prisma.proveedor.findUnique.mockResolvedValue(proveedorMock);
    prisma.inventario.findMany.mockResolvedValue(entradasMock);
    prisma.inventario.groupBy.mockResolvedValue([]);
    prisma.abono.groupBy.mockResolvedValue([]);

    await inventarioService.historialProveedor(
      appMock,
      { proveedorId: 3 },
      { sedeId: 2 },
      usuarioAdmin,
    );

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.sedeId).toBe(2);
  });
});
