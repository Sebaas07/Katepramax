/**
 * Tests unitarios — sesion.repository.js
 *
 * Verificamos que cada método construya la query correcta
 * y maneje bien la lógica interna (hashing de tokens).
 */
const crypto = require("crypto");
const { prisma } = require("../__mocks__/prisma");
const sesionRepository = require("../../src/repositories/sesion.repository");

const repo = sesionRepository(prisma);

// ── crear ─────────────────────────────────────────────────────────────────────

describe("sesionRepository.crear", () => {
  it("debería crear una sesión y retornar sesionId + refreshToken en texto plano", async () => {
    prisma.sesion.create.mockResolvedValue({ id: 42 });

    const result = await repo.crear({
      usuarioId: 1,
      ip: "127.0.0.1",
      userAgent: "jest",
    });

    expect(result.sesionId).toBe(42);
    expect(result.refreshToken).toBeDefined();
    expect(typeof result.refreshToken).toBe("string");
    expect(result.refreshToken.length).toBeGreaterThan(0);
  });

  it("debería guardar el hash del token, nunca el token en texto plano", async () => {
    prisma.sesion.create.mockResolvedValue({ id: 1 });

    const { refreshToken } = await repo.crear({
      usuarioId: 1,
      ip: "127.0.0.1",
    });

    const callArgs = prisma.sesion.create.mock.calls[0][0];
    const hashGuardado = callArgs.data.refreshHash;
    const hashEsperado = crypto
      .createHash("sha256")
      .update(refreshToken)
      .digest("hex");

    // Lo guardado en BD debe ser el SHA-256, no el token plano
    expect(hashGuardado).toBe(hashEsperado);
    expect(hashGuardado).not.toBe(refreshToken);
  });

  it("debería usar 7 días de expiración por defecto", async () => {
    prisma.sesion.create.mockResolvedValue({ id: 1 });

    await repo.crear({ usuarioId: 1, ip: "127.0.0.1" });

    const callArgs = prisma.sesion.create.mock.calls[0][0];
    const expiraEn = callArgs.data.expiraEn;
    const diasDiferencia = (expiraEn - Date.now()) / (1000 * 60 * 60 * 24);

    expect(diasDiferencia).toBeGreaterThanOrEqual(6.9);
    expect(diasDiferencia).toBeLessThanOrEqual(7.1);
  });
});

// ── findByRefreshToken ────────────────────────────────────────────────────────

describe("sesionRepository.findByRefreshToken", () => {
  it("debería buscar por el hash del token, no el token plano", async () => {
    prisma.sesion.findFirst.mockResolvedValue(null);

    const tokenPlano = "abc123";
    await repo.findByRefreshToken(tokenPlano);

    const callArgs = prisma.sesion.findFirst.mock.calls[0][0];
    const hashBuscado = callArgs.where.refreshHash;
    const hashEsperado = crypto
      .createHash("sha256")
      .update(tokenPlano)
      .digest("hex");

    expect(hashBuscado).toBe(hashEsperado);
    expect(hashBuscado).not.toBe(tokenPlano);
  });

  it("debería filtrar por activa: true y expiraEn futuro", async () => {
    prisma.sesion.findFirst.mockResolvedValue(null);

    await repo.findByRefreshToken("token");

    const callArgs = prisma.sesion.findFirst.mock.calls[0][0];
    expect(callArgs.where.activa).toBe(true);
    expect(callArgs.where.expiraEn).toHaveProperty("gt");
  });
});

// ── revocar ───────────────────────────────────────────────────────────────────

describe("sesionRepository.revocar", () => {
  it("debería actualizar activa: false para la sesión específica del usuario", async () => {
    prisma.sesion.updateMany.mockResolvedValue({ count: 1 });

    await repo.revocar(99, 1);

    expect(prisma.sesion.updateMany).toHaveBeenCalledWith({
      where: { id: 99, usuarioId: 1 },
      data: { activa: false },
    });
  });
});

// ── revocarTodas ──────────────────────────────────────────────────────────────

describe("sesionRepository.revocarTodas", () => {
  it("debería revocar todas las sesiones activas del usuario", async () => {
    prisma.sesion.updateMany.mockResolvedValue({ count: 3 });

    await repo.revocarTodas(1);

    expect(prisma.sesion.updateMany).toHaveBeenCalledWith({
      where: { usuarioId: 1, activa: true },
      data: { activa: false },
    });
  });
});

// ── rotar ─────────────────────────────────────────────────────────────────────

describe("sesionRepository.rotar", () => {
  it("debería actualizar el hash y retornar el nuevo refreshToken en texto plano", async () => {
    prisma.sesion.update.mockResolvedValue({ id: 99 });

    const nuevoToken = await repo.rotar(99, "127.0.0.1", "jest");

    expect(typeof nuevoToken).toBe("string");
    expect(nuevoToken.length).toBeGreaterThan(0);

    const callArgs = prisma.sesion.update.mock.calls[0][0];
    const hashGuardado = callArgs.data.refreshHash;
    const hashEsperado = crypto
      .createHash("sha256")
      .update(nuevoToken)
      .digest("hex");

    expect(hashGuardado).toBe(hashEsperado);
  });
});
