/**
 * Tests unitarios — auth.service.js
 *
 * Testeamos la lógica de negocio pura aislando:
 *  - app.prisma  → mock manual
 *  - app.jwt     → mock manual
 *  - bcrypt      → se usa real (es puro, sin IO)
 *  - registrarAccion → mockeada con vi.mock
 */
const bcrypt = require("bcrypt");
const { prisma } = require("./__mocks__/prisma");

// Mockeamos el logger para no escribir a BD en tests unitarios
vi.mock("../../src/utils/logger", () => ({
  registrarAccion: vi.fn().mockResolvedValue(undefined),
}));

const authService = require("../src/services/auth.service");

// ── App mock ──────────────────────────────────────────────────────────────────

/** Simula la instancia de Fastify que recibe el service */
const appMock = {
  prisma,
  jwt: {
    sign: vi.fn().mockReturnValue("access-token-firmado"),
  },
};

const svc = authService(appMock);

// ── Datos de prueba ───────────────────────────────────────────────────────────

const usuarioMock = {
  id: 1,
  usuario: "jmarin",
  nombreCompleto: "Juan Marín",
  correo: "juan@test.com",
  rol: "Admin",
  sedeId: 1,
  activo: true,
  sede: { nombre: "Sede Principal" },
  clave: bcrypt.hashSync("password123", 10),
};

// ── login ─────────────────────────────────────────────────────────────────────
describe("authService.login", () => {
  it("debería retornar accessToken, refreshToken y datos del usuario", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.sesion.create.mockResolvedValue({ id: 99 });
    prisma.usuario.update.mockResolvedValue({}); // updateUltimoAcceso
    prisma.log.create.mockResolvedValue({});

    const result = await svc.login(
      "jmarin",
      "password123",
      "127.0.0.1",
      "jest",
    );

    expect(result.accessToken).toBe("access-token-firmado");
    expect(result.refreshToken).toBeDefined();
    expect(result.user.usuario).toBe("jmarin");
    expect(result.user).not.toHaveProperty("clave");
  });

  it("debería lanzar AppError 401 si el usuario no existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      svc.login("noexiste", "password123", "127.0.0.1", null),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringMatching(/no encontrado/i),
    });
  });

  it("debería lanzar AppError 401 si el usuario está inactivo", async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuarioMock,
      activo: false,
    });

    await expect(
      svc.login("jmarin", "password123", "127.0.0.1", null),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("debería lanzar AppError 401 si la contraseña es incorrecta", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    await expect(
      svc.login("jmarin", "claveIncorrecta", "127.0.0.1", null),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringMatching(/contraseña/i),
    });
  });
});

// ── refresh ───────────────────────────────────────────────────────────────────

describe("authService.refresh", () => {
  it("debería lanzar AppError 400 si no se pasa refreshToken", async () => {
    await expect(svc.refresh(null, "127.0.0.1", null)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it("debería lanzar AppError 401 si el token no existe en BD", async () => {
    prisma.sesion.findFirst.mockResolvedValue(null);

    await expect(
      svc.refresh("token-inexistente", "127.0.0.1", null),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("debería retornar nuevos tokens si el refresh es válido", async () => {
    const sesionMock = {
      id: 99,
      usuario: { ...usuarioMock },
    };

    prisma.sesion.findFirst.mockResolvedValue(sesionMock);
    prisma.sesion.update.mockResolvedValue({ id: 99 });

    const result = await svc.refresh("token-valido", "127.0.0.1", null);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.usuario).toBe("jmarin");
    // La rotación debe haber llamado sesion.update
    expect(prisma.sesion.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 99 } }),
    );
  });

  it("debería lanzar AppError 401 si el usuario de la sesión está inactivo", async () => {
    prisma.sesion.findFirst.mockResolvedValue({
      id: 99,
      usuario: { ...usuarioMock, activo: false },
    });

    await expect(
      svc.refresh("token-valido", "127.0.0.1", null),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: expect.stringMatching(/inactivo/i),
    });
  });
});

// ── me ────────────────────────────────────────────────────────────────────────

describe("authService.me", () => {
  it("debería retornar los datos del usuario por ID", async () => {
    const userPublico = {
      id: 1,
      nombreCompleto: "Juan Marín",
      usuario: "jmarin",
      correo: "juan@test.com",
      rol: "Admin",
      sedeId: 1,
      sede: { nombre: "Sede Principal" },
      activo: true,
      telefono: null,
      creadoEn: new Date(),
    };

    prisma.usuario.findUnique.mockResolvedValue(userPublico);

    const result = await svc.me(1);

    expect(result.usuario).toBe("jmarin");
    expect(result).not.toHaveProperty("clave");
  });

  it("debería lanzar AppError 404 si el usuario no existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(svc.me(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});

// ── cambiarClave ──────────────────────────────────────────────────────────────

describe("authService.cambiarClave", () => {
  it("debería lanzar AppError 400 si la clave nueva es igual a la actual", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    await expect(
      svc.cambiarClave(1, "password123", "password123"),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/igual/i),
    });
  });

  it("debería lanzar AppError 400 si la clave actual es incorrecta", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    await expect(
      svc.cambiarClave(1, "claveEquivocada", "nueva456"),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/actual/i),
    });
  });

  it("debería actualizar la clave y revocar todas las sesiones", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.usuario.update.mockResolvedValue({});
    prisma.sesion.updateMany.mockResolvedValue({ count: 2 });
    prisma.log.create.mockResolvedValue({});

    await expect(
      svc.cambiarClave(1, "password123", "nuevaClave456"),
    ).resolves.toBeUndefined();

    // Se actualizó la clave
    expect(prisma.usuario.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 } }),
    );
    // Se revocaron todas las sesiones
    expect(prisma.sesion.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { usuarioId: 1, activa: true } }),
    );
  });
});
