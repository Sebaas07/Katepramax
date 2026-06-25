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
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock); // cantidadIngresada: +10, tipo: entrada
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      cantidadIngresada: -10,
      tipo: "salida",
    });
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.editar(
      appMock,
      1,
      { tipo: "salida" },
      usuarioAdmin,
    );

    // deltaNuevo=-10, deltaAnterior=+10 → ajuste=-20
    expect(prisma.stockSede.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { stockActual: { increment: -20 } } }),
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
