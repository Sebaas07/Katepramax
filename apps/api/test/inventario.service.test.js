/**
 * Tests unitarios — inventario.service.js
 * El service recibe (app, ...args) directamente, no usa factory.
 */
const { prisma } = require("./__mocks__/prisma");
const inventarioService = require("../src/services/inventario.service");

const appMock = { prisma };

// ── Datos de prueba ───────────────────────────────────────────────────────────

const sedeMock = { id: 1, nombre: "Sede Principal" };

const productoMock = {
  codigo: "PROD-001",
  descripcion: "Cemento Gris 50kg",
  precioCosto: 18000,
  activo: true,
};

const inventarioMock = {
  id: 1,
  fecha: new Date("2026-06-02"),
  semana: 23,
  sedeId: 1,
  productoId: "PROD-001",
  cantidadIngresada: 10,
  costo: 180000,
  sede: { id: 1, nombre: "Sede Principal" },
  producto: {
    codigo: "PROD-001",
    descripcion: "Cemento Gris 50kg",
    precioCosto: 18000,
  },
};

// ── registrar ─────────────────────────────────────────────────────────────────

describe("inventarioService.registrar", () => {
  it("debería lanzar AppError 404 si la sede no existe", async () => {
    prisma.sede.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.registrar(appMock, {
        sedeId: 999,
        productoId: "PROD-001",
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
      }),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/sede/i),
    });
  });

  it("debería lanzar AppError 404 si el producto no existe", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.registrar(appMock, {
        sedeId: 1,
        productoId: "NO-EXISTE",
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
      }),
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
      inventarioService.registrar(appMock, {
        sedeId: 1,
        productoId: "PROD-001",
        cantidadIngresada: 10,
        fecha: "2026-06-02",
        semana: 23,
      }),
    ).rejects.toMatchObject({
      statusCode: 422,
      message: expect.stringMatching(/inactivo/i),
    });
  });

  it("debería normalizar la fecha a medianoche UTC", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.upsert.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.registrar(appMock, {
      sedeId: 1,
      productoId: "PROD-001",
      cantidadIngresada: 10,
      fecha: "2026-06-02",
      semana: 23,
    });

    const callArg = prisma.inventario.upsert.mock.calls[0][0];
    const fecha = callArg.create.fecha;
    expect(fecha.getUTCHours()).toBe(0);
    expect(fecha.getUTCMinutes()).toBe(0);
    expect(fecha.getUTCSeconds()).toBe(0);
  });

  it("debería calcular el costo automáticamente si no se pasa", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock); // precioCosto: 18000
    prisma.inventario.upsert.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.registrar(appMock, {
      sedeId: 1,
      productoId: "PROD-001",
      cantidadIngresada: 5,
      fecha: "2026-06-02",
      semana: 23,
      // sin costo
    });

    const callCreate = prisma.inventario.upsert.mock.calls[0][0].create;
    expect(callCreate.costo).toBe(18000 * 5); // 90000
  });

  it("debería respetar el costo si se pasa explícitamente", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.upsert.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.registrar(appMock, {
      sedeId: 1,
      productoId: "PROD-001",
      cantidadIngresada: 5,
      fecha: "2026-06-02",
      semana: 23,
      costo: 50000,
    });

    const callCreate = prisma.inventario.upsert.mock.calls[0][0].create;
    expect(callCreate.costo).toBe(50000);
  });

  it("debería hacer upsert del stockSede después de registrar", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.producto.findUnique.mockResolvedValue(productoMock);
    prisma.inventario.upsert.mockResolvedValue(inventarioMock);
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.registrar(appMock, {
      sedeId: 1,
      productoId: "PROD-001",
      cantidadIngresada: 10,
      fecha: "2026-06-02",
      semana: 23,
    });

    expect(prisma.stockSede.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sedeId_productoId: { sedeId: 1, productoId: "PROD-001" } },
        update: { stockActual: { increment: 10 } },
        create: { sedeId: 1, productoId: "PROD-001", stockActual: 10 },
      }),
    );
  });
});

// ── obtenerLista ──────────────────────────────────────────────────────────────

describe("inventarioService.obtenerLista", () => {
  it("debería usar skip=0 y take=50 por defecto", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioService.obtenerLista(appMock, {});

    expect(prisma.inventario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 50 }),
    );
  });

  it("debería convertir semana a número", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioService.obtenerLista(appMock, { semana: "23" });

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.semana).toBe(23);
  });

  it("debería convertir sedeId a número", async () => {
    prisma.inventario.findMany.mockResolvedValue([]);

    await inventarioService.obtenerLista(appMock, { sedeId: "1" });

    const callWhere = prisma.inventario.findMany.mock.calls[0][0].where;
    expect(callWhere.sedeId).toBe(1);
  });
});

// ── obtenerPorId ──────────────────────────────────────────────────────────────

describe("inventarioService.obtenerPorId", () => {
  it("debería retornar el registro si existe", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock);

    const result = await inventarioService.obtenerPorId(appMock, 1);

    expect(result.id).toBe(1);
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.inventario.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.obtenerPorId(appMock, 999),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── editar ────────────────────────────────────────────────────────────────────

describe("inventarioService.editar", () => {
  it("debería lanzar AppError 404 si el registro no existe", async () => {
    prisma.inventario.findUnique.mockResolvedValue(null);

    await expect(
      inventarioService.editar(appMock, 999, { cantidadIngresada: 15 }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería ajustar stockSede con el delta correcto al editar cantidadIngresada", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock); // cantidadIngresada: 10
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      cantidadIngresada: 15,
    });
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.editar(appMock, 1, { cantidadIngresada: 15 });

    // delta = 15 - 10 = +5
    expect(prisma.stockSede.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { stockActual: { increment: 5 } },
      }),
    );
  });

  it("debería aplicar delta negativo si la cantidad disminuye", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock); // cantidadIngresada: 10
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      cantidadIngresada: 6,
    });
    prisma.stockSede.upsert.mockResolvedValue({});

    await inventarioService.editar(appMock, 1, { cantidadIngresada: 6 });

    // delta = 6 - 10 = -4
    expect(prisma.stockSede.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { stockActual: { increment: -4 } },
      }),
    );
  });

  it("no debería tocar stockSede si no cambia cantidadIngresada", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock);
    prisma.inventario.update.mockResolvedValue({
      ...inventarioMock,
      costo: 200000,
    });

    await inventarioService.editar(appMock, 1, { costo: 200000 });

    expect(prisma.stockSede.upsert).not.toHaveBeenCalled();
  });
});

// ── borrar ────────────────────────────────────────────────────────────────────

describe("inventarioService.borrar", () => {
  it("debería lanzar AppError 404 si el registro no existe", async () => {
    prisma.inventario.findUnique.mockResolvedValue(null);

    await expect(inventarioService.borrar(appMock, 999)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("debería eliminar el registro y decrementar el stock", async () => {
    prisma.inventario.findUnique.mockResolvedValue(inventarioMock); // cantidadIngresada: 10
    prisma.inventario.delete.mockResolvedValue(inventarioMock);
    prisma.stockSede.update.mockResolvedValue({});

    await inventarioService.borrar(appMock, 1);

    expect(prisma.inventario.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(prisma.stockSede.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sedeId_productoId: { sedeId: 1, productoId: "PROD-001" } },
        data: { stockActual: { decrement: 10 } },
      }),
    );
  });
});

// ── resumenSemanal ────────────────────────────────────────────────────────────

describe("inventarioService.resumenSemanal", () => {
  it("debería mapear sedeId y productoId a nombres legibles", async () => {
    prisma.inventario.groupBy.mockResolvedValue([
      {
        sedeId: 1,
        productoId: "PROD-001",
        _sum: { cantidadIngresada: 20, costo: 360000 },
        _max: { fecha: new Date("2026-06-06") },
      },
    ]);
    prisma.sede.findMany.mockResolvedValue([sedeMock]);
    prisma.producto.findMany.mockResolvedValue([
      { codigo: "PROD-001", descripcion: "Cemento Gris 50kg" },
    ]);

    const result = await inventarioService.resumenSemanal(appMock, 23);

    expect(result[0].sede).toBe("Sede Principal");
    expect(result[0].producto).toBe("Cemento Gris 50kg");
    expect(result[0].cantidad).toBe(20);
    expect(result[0].costo).toBe(360000);
  });

  it("debería usar fallback si la sede no está en el mapa", async () => {
    prisma.inventario.groupBy.mockResolvedValue([
      {
        sedeId: 99,
        productoId: "PROD-001",
        _sum: { cantidadIngresada: 5, costo: 10000 },
        _max: { fecha: new Date() },
      },
    ]);
    prisma.sede.findMany.mockResolvedValue([]);
    prisma.producto.findMany.mockResolvedValue([
      { codigo: "PROD-001", descripcion: "Cemento" },
    ]);

    const result = await inventarioService.resumenSemanal(appMock, 23);

    expect(result[0].sede).toBe("Sede 99");
  });
});
