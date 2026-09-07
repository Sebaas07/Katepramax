/**
 * Tests unitarios — calendario de negocio de Bogotá (UTC−5) de
 * apps/api/src/utils/contabilidad.js
 */
const {
  inicioDiaLocal,
  semanaNegocio,
  rangoDiaBogota,
  fechaBogotaISO,
  rangoSemana,
} = require("../src/utils/contabilidad");

describe("inicioDiaLocal (bucket UTC del día de Bogotá)", () => {
  it("debería fechar un cobro nocturno de Bogotá en su mismo día calendario", () => {
    // 01:00 UTC = 20:00 del día anterior en Bogotá (UTC−5).
    const resultado = inicioDiaLocal(new Date("2026-09-07T01:00:00.000Z"));
    expect(resultado.toISOString()).toBe("2026-09-06T00:00:00.000Z");
  });

  it("debería fechar el último instante del día de Bogotá en ese día", () => {
    // 04:59:59 UTC = 23:59:59 del 5 de septiembre en Bogotá.
    const resultado = inicioDiaLocal(new Date("2026-09-06T04:59:59.999Z"));
    expect(resultado.toISOString()).toBe("2026-09-05T00:00:00.000Z");
  });

  it("debería fechar un instante del mediodía de Bogotá en su día", () => {
    const resultado = inicioDiaLocal(new Date("2026-09-06T12:00:00.000Z"));
    expect(resultado.toISOString()).toBe("2026-09-06T00:00:00.000Z");
  });

  it("debería retornar null para fechas inválidas", () => {
    expect(inicioDiaLocal(null)).toBeNull();
    expect(inicioDiaLocal("fecha inválida")).toBeNull();
  });
});

describe("semanaNegocio (reinicia cada 7 de septiembre)", () => {
  it("debería mantener 2026-09-06 → 53 y 2026-09-07 → 1", () => {
    expect(semanaNegocio(new Date("2026-09-06T00:00:00.000Z"))).toBe(53);
    expect(semanaNegocio(new Date("2026-09-07T00:00:00.000Z"))).toBe(1);
  });

  it("debería numerar el resto del periodo", () => {
    // El 13 de septiembre cierra la semana 1 (07 al 13); el 14 abre la 2.
    expect(semanaNegocio(new Date("2026-09-13T00:00:00.000Z"))).toBe(1);
    expect(semanaNegocio(new Date("2026-09-14T00:00:00.000Z"))).toBe(2);
    expect(semanaNegocio(new Date("2026-09-05T00:00:00.000Z"))).toBe(52);
  });

  it("debería NO saltar de semana por un cobro nocturno de Bogotá", () => {
    // 01:00 UTC del 7 de septiembre = 20:00 del 6 en Bogotá → semana 53.
    expect(semanaNegocio(new Date("2026-09-07T01:00:00.000Z"))).toBe(53);
    // 04:59 UTC del 7 de septiembre = 23:59 del 6 en Bogotá → semana 53.
    expect(semanaNegocio(new Date("2026-09-07T04:59:59.000Z"))).toBe(53);
  });
});

describe("rangoDiaBogota (instantes del día comercial de Bogotá)", () => {
  it("debería abarcar 05:00 UTC → 05:00 UTC del día siguiente", () => {
    const { gte, lt } = rangoDiaBogota("2026-09-06", "2026-09-06");
    expect(gte.toISOString()).toBe("2026-09-06T05:00:00.000Z");
    expect(lt.toISOString()).toBe("2026-09-07T05:00:00.000Z");
  });

  it("debería incluir un cobro nocturno de Bogotá dentro del día", () => {
    const { gte, lt } = rangoDiaBogota("2026-09-06", "2026-09-06");
    const cobroNoche = new Date("2026-09-07T01:00:00.000Z"); // 20:00 del 06 en Bogotá
    const cobroMadrugada = new Date("2026-09-06T04:59:00.000Z"); // 23:59 del 05 en Bogotá
    expect(cobroNoche.getTime()).toBeGreaterThanOrEqual(gte.getTime());
    expect(cobroNoche.getTime()).toBeLessThan(lt.getTime());
    expect(cobroMadrugada.getTime()).toBeLessThan(gte.getTime());
  });
});

describe("fechaBogotaISO (etiqueta del día de Bogotá de un instante)", () => {
  it("debería etiquetar un instante por su día de Bogotá", () => {
    expect(fechaBogotaISO(new Date("2026-09-07T01:00:00.000Z"))).toBe("2026-09-06");
    expect(fechaBogotaISO(new Date("2026-09-06T23:59:00.000Z"))).toBe("2026-09-06");
    // Un bucket de medianoche UTC ya es un día de Bogotá.
    expect(fechaBogotaISO(new Date("2026-09-06T00:00:00.000Z"))).toBe("2026-09-06");
  });
});

describe("rangoSemana (rango de fechas de una semana de negocio)", () => {
  const aIso = (s) => new Date(`${s}T00:00:00.000Z`);

  it("debería devolver rangos de 7 días (inicio → fin + 6)", () => {
    const r1 = rangoSemana(1);
    const r2 = rangoSemana(2);
    expect((aIso(r1.fin) - aIso(r1.inicio)) / 86400000).toBe(6);
    // Semanas consecutivas empiezan 7 días después.
    expect((aIso(r2.inicio) - aIso(r1.inicio)) / 86400000).toBe(7);
    expect((aIso(r2.fin) - aIso(r1.fin)) / 86400000).toBe(7);
  });

  it("debería devolver fechas en formato YYYY-MM-DD", () => {
    const r = rangoSemana(18);
    expect(r.inicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.fin).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(r.fin > r.inicio).toBe(true);
  });

  it("debería iniciar la semana cuya numeración devuelve semanaNegocio", () => {
    // Para cualquier semana (exceptuando la "colita" 53 tras el reset) la fecha
    // de inicio debe numerarse con esa misma semana.
    for (let n = 1; n <= 52; n += 1) {
      const r = rangoSemana(n);
      expect(semanaNegocio(aIso(r.inicio))).toBe(n);
    }
  });
});