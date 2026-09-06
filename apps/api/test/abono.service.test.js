/**
 * Tests unitarios — abono.service.js
 */
const { prisma } = require("./__mocks__/prisma");
const service    = require("../src/services/abono.service");

const appMock = { prisma };
const usuarioMock = { rol: "Admin", sedeId: 1 };

const proveedorActivo   = { id: 1, nombre: "Cemex S.A.", activo: true };
const proveedorInactivo = { ...proveedorActivo, activo: false };
const sedeMock          = { id: 1, nombre: "Bogotá" };
const abonoMock = {
  id: 1, fecha: new Date("2026-05-05"), semana: 18,
  proveedorId: 1, sedeId: 1, valorPagado: 500000, observacion: null,
  proveedor: { id: 1, nombre: "Cemex S.A." },
  sede:      { id: 1, nombre: "Bogotá" },
};

// ── registrar ─────────────────────────────────────────────────────────────────

describe("abonoService.registrar", () => {
  const body = { fecha: "2026-05-05", semana: 18, proveedorId: 1, sedeId: 1, valorPagado: 500000 };

it("debería lanzar AppError 404 si el proveedor no existe", async () => {
     prisma.proveedor.findUnique.mockResolvedValue(null);

     await expect(service.registrar(appMock, body, usuarioMock)).rejects.toMatchObject({
       statusCode: 404, message: expect.stringMatching(/proveedor/i),
     });
   });

it("debería lanzar AppError 422 si el proveedor está inactivo", async () => {
     prisma.proveedor.findUnique.mockResolvedValue(proveedorInactivo);

     await expect(service.registrar(appMock, body, usuarioMock)).rejects.toMatchObject({
       statusCode: 422, message: expect.stringMatching(/inactivo/i),
     });
   });

it("debería lanzar AppError 404 si la sede no existe", async () => {
     prisma.proveedor.findUnique.mockResolvedValue(proveedorActivo);
     prisma.sede.findUnique.mockResolvedValue(null);

     await expect(service.registrar(appMock, body, usuarioMock)).rejects.toMatchObject({
       statusCode: 404, message: expect.stringMatching(/sede/i),
     });
   });

it("debería pasar fecha como objeto Date a repo.crear", async () => {
     prisma.proveedor.findUnique.mockResolvedValue(proveedorActivo);
     prisma.sede.findUnique.mockResolvedValue(sedeMock);
     prisma.abono.create.mockResolvedValue(abonoMock);

     await service.registrar(appMock, body, usuarioMock);

     const data = prisma.abono.create.mock.calls[0][0].data;
     expect(data.fecha).toBeInstanceOf(Date);
     expect(data.valorPagado).toBe(500000);
   });

it("debería usar observacion=null si no se pasa", async () => {
     prisma.proveedor.findUnique.mockResolvedValue(proveedorActivo);
     prisma.sede.findUnique.mockResolvedValue(sedeMock);
     prisma.abono.create.mockResolvedValue(abonoMock);

     await service.registrar(appMock, body, usuarioMock);

     const data = prisma.abono.create.mock.calls[0][0].data;
     expect(data.observacion).toBeNull();
   });

 it("debería crear el Egreso del pago al proveedor (origen abono-proveedor)", async () => {
     prisma.proveedor.findUnique.mockResolvedValue(proveedorActivo);
     prisma.sede.findUnique.mockResolvedValue(sedeMock);
     prisma.abono.create.mockResolvedValue(abonoMock);
     prisma.egreso.create.mockResolvedValue({ id: 7 });

     await service.registrar(appMock, body, usuarioMock);

     expect(prisma.egreso.create).toHaveBeenCalledWith({
       data: expect.objectContaining({
         origen: "abono-proveedor",
         idReferencia: abonoMock.id,
         total: 500000,
       }),
       include: expect.anything(),
     });
   });
 });

// ── obtenerLista ──────────────────────────────────────────────────────────────

describe("abonoService.obtenerLista", () => {
   it("debería convertir semana a número", async () => {
     prisma.abono.findMany.mockResolvedValue([]);

     await service.obtenerLista(appMock, { semana: "18" }, usuarioMock);

     const filtros = prisma.abono.findMany.mock.calls[0][0].where;
     expect(filtros.semana).toBe(18);
   });

   it("debería convertir sedeId a número", async () => {
     prisma.abono.findMany.mockResolvedValue([]);

     await service.obtenerLista(appMock, { sedeId: "1" }, usuarioMock);

     const filtros = prisma.abono.findMany.mock.calls[0][0].where;
     expect(filtros.sedeId).toBe(1);
   });

   it("debería convertir proveedorId a número", async () => {
     prisma.abono.findMany.mockResolvedValue([]);

     await service.obtenerLista(appMock, { proveedorId: "2" }, usuarioMock);

     const filtros = prisma.abono.findMany.mock.calls[0][0].where;
     expect(filtros.proveedorId).toBe(2);
   });
 });

// ── obtenerPorId ──────────────────────────────────────────────────────────────

describe("abonoService.obtenerPorId", () => {
   it("debería retornar el abono si existe", async () => {
     prisma.abono.findUnique.mockResolvedValue(abonoMock);

     const result = await service.obtenerPorId(appMock, 1, usuarioMock);

     expect(result.id).toBe(1);
   });

   it("debería lanzar AppError 404 si no existe", async () => {
     prisma.abono.findUnique.mockResolvedValue(null);

     await expect(service.obtenerPorId(appMock, 999, usuarioMock)).rejects.toMatchObject({ statusCode: 404 });
   });
 });

// ── editar ────────────────────────────────────────────────────────────────────

describe("abonoService.editar", () => {
   it("debería lanzar AppError 404 si el abono no existe", async () => {
     prisma.abono.findUnique.mockResolvedValue(null);

     await expect(service.editar(appMock, 999, { valorPagado: 600000 }, usuarioMock)).rejects.toMatchObject({
       statusCode: 404,
     });
   });

   it("debería pasar solo los campos definidos al repositorio", async () => {
     prisma.abono.findUnique.mockResolvedValue(abonoMock);
     prisma.abono.update.mockResolvedValue({ ...abonoMock, valorPagado: 600000 });
     prisma.egreso.findFirst.mockResolvedValue(null);

     await service.editar(appMock, 1, { valorPagado: 600000 }, usuarioMock);

     const data = prisma.abono.update.mock.calls[0][0].data;
     expect(data.valorPagado).toBe(600000);
     expect(data.observacion).toBeUndefined(); // no se pasó
   });

   it("debería permitir actualizar observacion a string vacío", async () => {
     prisma.abono.findUnique.mockResolvedValue(abonoMock);
     prisma.abono.update.mockResolvedValue(abonoMock);
     prisma.egreso.findFirst.mockResolvedValue(null);

     await service.editar(appMock, 1, { observacion: "" }, usuarioMock);

     const data = prisma.abono.update.mock.calls[0][0].data;
     expect(data.observacion).toBe("");
   });

   it("debería sincronizar el total del Egreso si cambia el valorPagado", async () => {
     prisma.abono.findUnique.mockResolvedValue(abonoMock);
     prisma.abono.update.mockResolvedValue({ ...abonoMock, valorPagado: 600000 });
     prisma.egreso.findFirst.mockResolvedValue({ id: 7, total: 500000 });

     await service.editar(appMock, 1, { valorPagado: 600000 }, usuarioMock);

     expect(prisma.egreso.update).toHaveBeenCalledWith({
       where: { id: 7 },
       data: expect.objectContaining({ total: 600000 }),
     });
   });
 });

// ── borrar ────────────────────────────────────────────────────────────────────

describe("abonoService.borrar", () => {
   it("debería lanzar AppError 404 si no existe", async () => {
     prisma.abono.findUnique.mockResolvedValue(null);

     await expect(service.borrar(appMock, 999, usuarioMock)).rejects.toMatchObject({ statusCode: 404 });
   });

   it("debería llamar repo.eliminar y borrar el Egreso asociado si existe", async () => {
     prisma.abono.findUnique.mockResolvedValue(abonoMock);
     prisma.abono.delete.mockResolvedValue(abonoMock);
     prisma.egreso.deleteMany.mockResolvedValue({ count: 1 });

     await service.borrar(appMock, 1, usuarioMock);

     expect(prisma.abono.delete).toHaveBeenCalledWith({ where: { id: 1 } });
     expect(prisma.egreso.deleteMany).toHaveBeenCalledWith({
       where: expect.objectContaining({ origen: "abono-proveedor", idReferencia: 1 }),
     });
   });
 });

// ── resumenPorProveedor ───────────────────────────────────────────────────────

describe("abonoService.resumenPorProveedor", () => {
   it("debería mapear proveedorId a nombre y calcular totales", async () => {
     prisma.abono.groupBy.mockResolvedValue([
       { proveedorId: 1, _sum: { valorPagado: 500000 }, _count: { id: 2 } },
     ]);
     prisma.proveedor.findMany.mockResolvedValue([{ id: 1, nombre: "Cemex S.A." }]);

     const result = await service.resumenPorProveedor(appMock, 18, usuarioMock);

     expect(result[0].proveedor).toBe("Cemex S.A.");
     expect(result[0].totalPagado).toBe(500000);
     expect(result[0].abonos).toBe(2);
   });

   it("debería usar fallback si el proveedor no está en el mapa", async () => {
     prisma.abono.groupBy.mockResolvedValue([
       { proveedorId: 99, _sum: { valorPagado: 100000 }, _count: { id: 1 } },
     ]);
     prisma.proveedor.findMany.mockResolvedValue([]);

     const result = await service.resumenPorProveedor(appMock, 18, usuarioMock);

     expect(result[0].proveedor).toBe("Proveedor 99");
   });
 });

// ── resumenPorSede ────────────────────────────────────────────────────────────

describe("abonoService.resumenPorSede", () => {
   it("debería mapear sedeId a nombre", async () => {
     prisma.abono.groupBy.mockResolvedValue([
       { sedeId: 1, _sum: { valorPagado: 500000 } },
     ]);
     prisma.sede.findMany.mockResolvedValue([{ id: 1, nombre: "Bogotá" }]);

     const result = await service.resumenPorSede(appMock, 18, usuarioMock);

     expect(result[0].sede).toBe("Bogotá");
     expect(result[0].totalPagado).toBe(500000);
   });

   it("debería usar fallback si la sede no está en el mapa", async () => {
     prisma.abono.groupBy.mockResolvedValue([
       { sedeId: 99, _sum: { valorPagado: 50000 } },
     ]);
     prisma.sede.findMany.mockResolvedValue([]);

     const result = await service.resumenPorSede(appMock, 18, usuarioMock);

     expect(result[0].sede).toBe("Sede 99");
   });
 });
