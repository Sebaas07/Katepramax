/**
 * Tests unitarios — sku.service.js
 */
const { prisma } = require("./__mocks__/prisma");
const { generarSku, derivarPrefijo } = require("../src/services/sku.service");

describe("skuService.derivarPrefijo", () => {
  it("debería tomar las 3 primeras letras en mayúsculas", () => {
    expect(derivarPrefijo("Arroz Diana 500g")).toBe("ARR");
  });

  it("debería quitar tildes (la Ñ se pliega a N, igual que cualquier vocal acentuada)", () => {
    expect(derivarPrefijo("Ñame criollo")).toBe("NAM");
  });

  it("debería ignorar números y símbolos iniciales", () => {
    expect(derivarPrefijo("3M Cinta transparente")).toBe("MCI");
  });

  it("debería usar lo disponible si la descripción tiene menos de 3 letras", () => {
    expect(derivarPrefijo("Ron 1L")).toBe("RON");
    expect(derivarPrefijo("A1")).toBe("A");
  });

  it("debería lanzar AppError 400 si no hay ninguna letra en la descripción", () => {
    expect(() => derivarPrefijo("123456")).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it("debería lanzar AppError 400 si la descripción está vacía", () => {
    expect(() => derivarPrefijo("")).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });
});

describe("skuService.generarSku", () => {
  it("debería generar el sku combinando el prefijo derivado y el consecutivo con padding", async () => {
    prisma.skuContador.upsert.mockResolvedValue({ prefijo: "ARR", ultimoNumero: 7 });

    const sku = await generarSku(prisma, "Arroz Diana 500g");

    expect(sku).toBe("ARR-007");
    expect(prisma.skuContador.upsert).toHaveBeenCalledWith({
      where: { prefijo: "ARR" },
      update: { ultimoNumero: { increment: 1 } },
      create: { prefijo: "ARR", ultimoNumero: 1 },
    });
  });

  it("dos productos con la misma descripción inicial comparten el prefijo y consecutivo", async () => {
    prisma.skuContador.upsert.mockResolvedValueOnce({ prefijo: "ARR", ultimoNumero: 1 });
    prisma.skuContador.upsert.mockResolvedValueOnce({ prefijo: "ARR", ultimoNumero: 2 });

    const sku1 = await generarSku(prisma, "Arroz Diana 500g");
    const sku2 = await generarSku(prisma, "Arroz Roa 500g");

    expect(sku1).toBe("ARR-001");
    expect(sku2).toBe("ARR-002");
  });
});
