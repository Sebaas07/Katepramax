/**
 * Tests de integración — rutas HTTP de Auth
 *
 * Estrategia: levantamos la app real con buildApp() pero mockeamos
 * app.prisma para no necesitar una DB real.
 *
 * Rutas cubiertas:
 *  POST /api/v1/auth/login
 *  POST /api/v1/auth/refresh
 *  POST /api/v1/auth/logout
 *  GET  /api/v1/auth/me
 *  PATCH /api/v1/auth/clave
 */
const { buildApp } = require("../src/app");
const bcrypt = require("bcrypt");
const { prisma } = require("./__mocks__/prisma");

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Usuario base que simula lo que devolvería la BD */
const usuarioMock = {
  id: 1,
  usuario: "jmarin",
  nombreCompleto: "Juan Marín",
  correo: "juan@test.com",
  rol: "Admin",
  sedeId: 1,
  activo: true,
  sede: { nombre: "Sede Principal" },
  // Hash de "password123" — se genera una sola vez y se reutiliza
  clave: bcrypt.hashSync("password123", 10),
};

/** Sesión activa simulada */
const sesionMock = {
  id: 99,
  usuarioId: usuarioMock.id,
  activa: true,
  expiraEn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  usuario: { ...usuarioMock },
};

// ── Setup ─────────────────────────────────────────────────────────────────────
vi.mock("../src/utils/logger", () => ({
  registrarAccion: vi.fn().mockResolvedValue(undefined),
}));

let app;

beforeAll(async () => {
  app = await buildApp();

  app.prisma = prisma;

  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────

describe("POST /api/v1/auth/login", () => {
  it("debería retornar 200 con accessToken y refreshToken al hacer login exitoso", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.sesion.create.mockResolvedValue({ id: 99 });
    prisma.log.create.mockResolvedValue({});

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { usuario: "jmarin", contrasena: "password123" },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toHaveProperty("accessToken");
    expect(body).toHaveProperty("refreshToken");
    expect(body.user.usuario).toBe("jmarin");
    expect(body.user.rol).toBe("Admin");
  });

  it("debería retornar 401 si el usuario no existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { usuario: "noexiste", contrasena: "password123" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/no encontrado/i);
  });

  it("debería retornar 401 si el usuario está inactivo", async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuarioMock,
      activo: false,
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { usuario: "jmarin", contrasena: "password123" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/inactivo/i);
  });

  it("debería retornar 401 si la contraseña es incorrecta", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { usuario: "jmarin", contrasena: "claveIncorrecta" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/contraseña/i);
  });

  it("debería retornar 400 si faltan campos requeridos", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── POST /api/v1/auth/refresh ─────────────────────────────────────────────────

describe("POST /api/v1/auth/refresh", () => {
  it("debería retornar 400 si no se envía refreshToken", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {},
    });

    expect(res.statusCode).toBe(400);
  });

  it("debería retornar 401 si el refreshToken no existe en BD", async () => {
    prisma.sesion.findFirst.mockResolvedValue(null);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: { refreshToken: "token-falso-que-no-existe" },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/inválida|expirada/i);
  });

  it("debería retornar 200 con nuevos tokens si el refreshToken es válido", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionMock);
    prisma.sesion.update.mockResolvedValue({ id: 99 });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      payload: {
        refreshToken:
          "un-refresh-token-valido-de-80-chars-de-largo-000000000000000000000000000",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveProperty("accessToken");
    expect(body).toHaveProperty("refreshToken");
  });
});

// ── Rutas protegidas: helper para obtener un token válido ─────────────────────

/**
 * Genera un accessToken real firmado con el JWT de la app.
 * Simula lo que haría un login exitoso.
 */
function generarToken(sesionId = 99) {
  return app.jwt.sign({ sesionId }, { expiresIn: "15m" });
}

// ── GET /api/v1/auth/me ───────────────────────────────────────────────────────

describe("GET /api/v1/auth/me", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
    });

    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 con datos del usuario autenticado", async () => {
    // El middleware verifyToken busca la sesión por ID
    prisma.sesion.findFirst.mockResolvedValue(sesionMock);
    // El servicio me() busca el usuario por ID
    prisma.usuario.findUnique.mockResolvedValue({
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
    });

    const token = generarToken(99);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.usuario).toBe("jmarin");
    expect(body).not.toHaveProperty("clave"); // nunca debe exponerse
  });

  it("debería retornar 401 si la sesión fue revocada", async () => {
    // Simula sesión inexistente (ya revocada)
    prisma.sesion.findFirst.mockResolvedValue(null);

    const token = generarToken(99);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json().error).toMatch(/inexistente|revocada/i);
  });
});

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────

describe("POST /api/v1/auth/logout", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
    });

    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 200 al hacer logout correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionMock);
    prisma.sesion.updateMany.mockResolvedValue({ count: 1 });

    const token = generarToken(99);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toMatch(/cerrada/i);
  });
});

// ── PATCH /api/v1/auth/clave ──────────────────────────────────────────────────

describe("PATCH /api/v1/auth/clave", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/auth/clave",
      payload: { claveActual: "password123", claveNueva: "nueva#456" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 400 si la clave nueva es igual a la actual", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionMock);
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    const token = generarToken(99);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/auth/clave",
      headers: { authorization: `Bearer ${token}` },
      payload: { claveActual: "password#123", claveNueva: "password#123" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/igual/i);
  });

  it("debería retornar 400 si la clave actual es incorrecta", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionMock);
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    const token = generarToken(99);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/auth/clave",
      headers: { authorization: `Bearer ${token}` },
      payload: { claveActual: "claveEquivocada", claveNueva: "nueva#456" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/actual/i);
  });

  it("debería retornar 200 al cambiar la clave correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionMock);
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.usuario.update.mockResolvedValue({ ...usuarioMock });
    prisma.sesion.updateMany.mockResolvedValue({ count: 1 });
    prisma.log.create.mockResolvedValue({});

    const token = generarToken(99);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/auth/clave",
      headers: { authorization: `Bearer ${token}` },
      payload: { claveActual: "password123", claveNueva: "nuevaClave#456" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().message).toMatch(/actualizada/i);
    // Verifica que se revocaron todas las sesiones
    expect(prisma.sesion.updateMany).toHaveBeenCalled();
  });
});
