/**
 * Tests unitarios — egreso.service.js + ingreso.service.js
 */
const { prisma } = require("./__mocks__/prisma");
const egresoSvc = require("../src/services/egreso.service");
const ingresoSvc = require("../src/services/ingreso.service");

const appMock = { prisma };
const sedeMock = { id: 1, nombre: "Bogotá" };
const usuarioAdmin = { id: 1, rol: "Admin", sedeId: 1 };

// ═══════════════════════════════════════════════════════════════════════════════
// EGRESO SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const egresoMock = {
  id: 1,
  fecha: new Date("2026-05-05"),
  semana: 18,
  sedeId: 1,
  concepto: "Transporte",
  total: 80000,
  observacion: null,
  sede: { id: 1, nombre: "Bogotá" },
};

describe("egresoService.registrar", () => {
  const body = {
    fecha: "2026-05-05",
    semana: 18,
    sedeId: 1,
    concepto: "Transporte",
    total: 80000,
  };

  it("debería lanzar AppError 404 si la sede no existe", async () => {
    prisma.sede.findUnique.mockResolvedValue(null);

    await expect(
      egresoSvc.registrar(appMock, body, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/sede/i),
    });
  });

  it("debería pasar fecha como Date y total como número a repo.crear", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.egreso.create.mockResolvedValue(egresoMock);

    await egresoSvc.registrar(appMock, body, usuarioAdmin);

    const data = prisma.egreso.create.mock.calls[0][0].data;
    expect(data.fecha).toBeInstanceOf(Date);
    expect(data.total).toBe(80000);
    expect(data.concepto).toBe("Transporte");
  });

  it("debería usar observacion=null si no se pasa", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.egreso.create.mockResolvedValue(egresoMock);

    await egresoSvc.registrar(appMock, body, usuarioAdmin);

    const data = prisma.egreso.create.mock.calls[0][0].data;
    expect(data.observacion).toBeNull();
  });
});

describe("egresoService.obtenerPorId", () => {
  it("debería retornar el egreso si existe", async () => {
    prisma.egreso.findUnique.mockResolvedValue(egresoMock);

    const result = await egresoSvc.obtenerPorId(appMock, 1, usuarioAdmin);

    expect(result.id).toBe(1);
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.egreso.findUnique.mockResolvedValue(null);

    await expect(
      egresoSvc.obtenerPorId(appMock, 999, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("egresoService.editar", () => {
  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.egreso.findUnique.mockResolvedValue(null);

    await expect(
      egresoSvc.editar(appMock, 999, { total: 90000 }, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  }); // ✅ Corrección: cerrar el it correctamente

  it("debería convertir total a número", async () => {
    prisma.egreso.findUnique.mockResolvedValue(egresoMock);
    prisma.egreso.update.mockResolvedValue({ ...egresoMock, total: 90000 });

    await egresoSvc.editar(appMock, 1, { total: "90000" }, usuarioAdmin);

    const data = prisma.egreso.update.mock.calls[0][0].data;
    expect(typeof data.total).toBe("number");
    expect(data.total).toBe(90000);
  });

  it("no debería incluir campos no enviados en el update", async () => {
    prisma.egreso.findUnique.mockResolvedValue(egresoMock);
    prisma.egreso.update.mockResolvedValue(egresoMock);

    await egresoSvc.editar(appMock, 1, { concepto: "Arriendo" }, usuarioAdmin);

    const data = prisma.egreso.update.mock.calls[0][0].data;
    expect(data.concepto).toBe("Arriendo");
    expect(data.total).toBeUndefined();
  });
});

describe("egresoService.borrar", () => {
  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.egreso.findUnique.mockResolvedValue(null);

    await expect(
      egresoSvc.borrar(appMock, 999, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería llamar repo.eliminar si existe", async () => {
    prisma.egreso.findUnique.mockResolvedValue(egresoMock);
    prisma.egreso.delete.mockResolvedValue(egresoMock);

    await egresoSvc.borrar(appMock, 1, usuarioAdmin);

    expect(prisma.egreso.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe("egresoService.resumenPorSede", () => {
  it("debería calcular totalGeneral sumando todas las sedes", async () => {
    prisma.egreso.groupBy.mockResolvedValue([
      { sedeId: 1, _sum: { total: 80000 }, _count: { id: 2 } },
      { sedeId: 2, _sum: { total: 40000 }, _count: { id: 1 } },
    ]);
    prisma.sede.findMany.mockResolvedValue([
      { id: 1, nombre: "Bogotá" },
      { id: 2, nombre: "Villavicencio" },
    ]);

    const result = await egresoSvc.resumenPorSede(appMock, 18, usuarioAdmin);

    expect(result.totalGeneral).toBe(120000);
    expect(result.porSede).toHaveLength(2);
  });

  it("debería usar fallback si la sede no está en el mapa", async () => {
    prisma.egreso.groupBy.mockResolvedValue([
      { sedeId: 99, _sum: { total: 5000 }, _count: { id: 1 } },
    ]);
    prisma.sede.findMany.mockResolvedValue([]);

    const result = await egresoSvc.resumenPorSede(appMock, 18, usuarioAdmin);

    expect(result.porSede[0].sede).toBe("Sede 99");
  });
});

describe("egresoService.resumenPorConcepto", () => {
  it("debería mapear concepto, registros y total", async () => {
    prisma.egreso.groupBy.mockResolvedValue([
      { concepto: "Transporte", _sum: { total: 80000 }, _count: { id: 3 } },
    ]);

    const result = await egresoSvc.resumenPorConcepto(
      appMock,
      18,
      usuarioAdmin,
    );

    expect(result[0].concepto).toBe("Transporte");
    expect(result[0].total).toBe(80000);
    expect(result[0].registros).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INGRESO SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const ingresoMock = {
  id: 1,
  fecha: new Date("2026-05-05"),
  semana: 18,
  sedeId: 1,
  efectivo: 300000,
  cuentas: 150000,
  total: 450000,
  observacion: null,
  sede: { id: 1, nombre: "Bogotá" },
};

describe("ingresoService.registrar", () => {
  const body = {
    fecha: "2026-05-05",
    semana: 18,
    sedeId: 1,
    efectivo: 300000,
    cuentas: 150000,
  };

  it("debería lanzar AppError 404 si la sede no existe", async () => {
    prisma.sede.findUnique.mockResolvedValue(null);

    await expect(
      ingresoSvc.registrar(appMock, body, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/sede/i),
    });
  });

  it("debería calcular total = efectivo + cuentas en el servidor", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.ingreso.create.mockResolvedValue(ingresoMock);

    await ingresoSvc.registrar(appMock, body, usuarioAdmin);

    const data = prisma.ingreso.create.mock.calls[0][0].data;
    expect(data.total).toBe(450000);
  });

  it("debería usar cuentas=0 si no se pasa", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.ingreso.create.mockResolvedValue({
      ...ingresoMock,
      cuentas: 0,
      total: 300000,
    });

    await ingresoSvc.registrar(
      appMock,
      { ...body, cuentas: undefined },
      usuarioAdmin,
    );

    const data = prisma.ingreso.create.mock.calls[0][0].data;
    expect(data.cuentas).toBe(0);
    expect(data.total).toBe(300000);
  });

  it("debería pasar fecha como Date y observacion=null si no se pasa", async () => {
    prisma.sede.findUnique.mockResolvedValue(sedeMock);
    prisma.ingreso.create.mockResolvedValue(ingresoMock);

    await ingresoSvc.registrar(appMock, body, usuarioAdmin);

    const data = prisma.ingreso.create.mock.calls[0][0].data;
    expect(data.fecha).toBeInstanceOf(Date);
    expect(data.observacion).toBeNull();
  });
});

describe("ingresoService.obtenerPorId", () => {
  it("debería retornar el ingreso si existe", async () => {
    prisma.ingreso.findUnique.mockResolvedValue(ingresoMock);

    const result = await ingresoSvc.obtenerPorId(appMock, 1, usuarioAdmin);

    expect(result.id).toBe(1);
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.ingreso.findUnique.mockResolvedValue(null);

    await expect(
      ingresoSvc.obtenerPorId(appMock, 999, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("ingresoService.editar", () => {
  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.ingreso.findUnique.mockResolvedValue(null);

    await expect(
      ingresoSvc.editar(appMock, 999, { efectivo: 400000 }, usuarioAdmin),
    ).rejects.toMatchObject({
      statusCode: 404,
    });
  }); // ✅ Corrección: cerrar el it correctamente

  it("debería recalcular total usando cuentas actuales si solo cambia efectivo", async () => {
    // actual: efectivo=300000, cuentas=150000
    prisma.ingreso.findUnique.mockResolvedValue(ingresoMock);
    prisma.ingreso.update.mockResolvedValue({
      ...ingresoMock,
      efectivo: 400000,
      total: 550000,
    });

    await ingresoSvc.editar(appMock, 1, { efectivo: 400000 }, usuarioAdmin);

    const data = prisma.ingreso.update.mock.calls[0][0].data;
    // total = 400000 (nuevo efectivo) + 150000 (cuentas actual) = 550000
    expect(data.total).toBe(550000);
  });

  it("debería recalcular total usando efectivo actual si solo cambia cuentas", async () => {
    prisma.ingreso.findUnique.mockResolvedValue(ingresoMock);
    prisma.ingreso.update.mockResolvedValue({
      ...ingresoMock,
      cuentas: 200000,
      total: 500000,
    });

    await ingresoSvc.editar(appMock, 1, { cuentas: 200000 }, usuarioAdmin);

    const data = prisma.ingreso.update.mock.calls[0][0].data;
    // total = 300000 (efectivo actual) + 200000 (nuevo cuentas) = 500000
    expect(data.total).toBe(500000);
  });

  it("no debería actualizar total si solo cambia observacion", async () => {
    prisma.ingreso.findUnique.mockResolvedValue(ingresoMock);
    prisma.ingreso.update.mockResolvedValue(ingresoMock);

    await ingresoSvc.editar(appMock, 1, { observacion: "Nota" }, usuarioAdmin);

    const data = prisma.ingreso.update.mock.calls[0][0].data;
    expect(data.total).toBeUndefined();
    expect(data.observacion).toBe("Nota");
  });
});

describe("ingresoService.borrar", () => {
  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.ingreso.findUnique.mockResolvedValue(null);

    await expect(
      ingresoSvc.borrar(appMock, 999, usuarioAdmin),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería llamar repo.eliminar si existe", async () => {
    prisma.ingreso.findUnique.mockResolvedValue(ingresoMock);
    prisma.ingreso.delete.mockResolvedValue(ingresoMock);

    await ingresoSvc.borrar(appMock, 1, usuarioAdmin);

    expect(prisma.ingreso.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe("ingresoService.resumenPorSede", () => {
  it("debería calcular totalGeneral sumando todas las sedes", async () => {
    prisma.ingreso.groupBy.mockResolvedValue([
      {
        sedeId: 1,
        _sum: { efectivo: 300000, cuentas: 150000, total: 450000 },
        _count: { id: 2 },
      },
      {
        sedeId: 2,
        _sum: { efectivo: 200000, cuentas: 50000, total: 250000 },
        _count: { id: 1 },
      },
    ]);
    prisma.sede.findMany.mockResolvedValue([
      { id: 1, nombre: "Bogotá" },
      { id: 2, nombre: "Villavicencio" },
    ]);

    const result = await ingresoSvc.resumenPorSede(appMock, 18, usuarioAdmin);

    expect(result.totalGeneral.total).toBe(700000);
    expect(result.totalGeneral.efectivo).toBe(500000);
    expect(result.totalGeneral.cuentas).toBe(200000);
    expect(result.porSede).toHaveLength(2);
  });
});
