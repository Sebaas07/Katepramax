/**
 * Tests de integración — rutas HTTP de Usuario
 *
 * Rutas cubiertas (todas soloAdmin):
 *  GET    /api/v1/usuarios
 *  GET    /api/v1/usuarios/:id
 *  POST   /api/v1/usuarios
 *  PUT    /api/v1/usuarios/:id
 *  PATCH  /api/v1/usuarios/:id          (desactivar)
 *  PATCH  /api/v1/usuarios/:id/activar
 */
const { buildApp } = require("../src/app");
const { prisma } = require("./__mocks__/prisma");

// ── Datos de prueba ───────────────────────────────────────────────────────────

const usuarioMock = {
  id: 2,
  nombreCompleto: "Carlos López",
  usuario: "clopez",
  correo: "carlos@test.com",
  rol: "Bodega",
  sedeId: 1,
  sede: { nombre: "Sede Principal" },
  activo: true,
  telefono: null,
  creadoEn: new Date(),
};

const sesionAdminMock = {
  id: 10,
  activa: true,
  expiraEn: new Date(Date.now() + 86400000),
  usuario: { id: 1, usuario: "admin", rol: "Admin", sedeId: 1, activo: true },
};

const sesionBodegaMock = {
  ...sesionAdminMock,
  id: 11,
  usuario: { ...sesionAdminMock.usuario, rol: "Bodega" },
};

// Sede tipo Bodega activa — exigida por validarSede al crear/editar usuarios
const sedeBodegaMock = { id: 1, nombre: "Bodega Principal", tipo: "Bodega", activo: true };

// Sede tipo Oficina activa — exigida por el rol Bodega (opera sobre su bodega)
const sedeOficinaMock = { id: 6, nombre: "Oficina Central", tipo: "Oficina", activo: true };

// ── Setup ─────────────────────────────────────────────────────────────────────

let app;
let tokenAdmin;
let tokenBodega;

beforeAll(async () => {
  app = await buildApp();
  app.prisma = prisma;
  await app.ready();

  tokenAdmin = app.jwt.sign({ sesionId: 10 }, { expiresIn: "15m" });
  tokenBodega = app.jwt.sign({ sesionId: 11 }, { expiresIn: "15m" });
});

afterAll(async () => {
  await app.close();
});

// ── GET /api/v1/usuarios ──────────────────────────────────────────────────────

describe("GET /api/v1/usuarios", () => {
  it("debería retornar 401 sin token", async () => {
    const res = await app.inject({ method: "GET", url: "/api/v1/usuarios" });
    expect(res.statusCode).toBe(401);
  });

  it("debería retornar 403 si el rol es Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 200 con lista de usuarios (Admin)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findMany.mockResolvedValue([usuarioMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0].usuario).toBe("clopez");
  });

  it("no debería exponer la clave en la respuesta", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findMany.mockResolvedValue([usuarioMock]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.json()[0]).not.toHaveProperty("clave");
  });
});

// ── GET /api/v1/usuarios/entregadores ─────────────────────────────────────────

describe("GET /api/v1/usuarios/entregadores", () => {
  it("debería retornar 403 si el rol es Oficinista (no asigna)", async () => {
    const sesionOficinistaMock = {
      ...sesionAdminMock,
      id: 13,
      usuario: { ...sesionAdminMock.usuario, rol: "Oficinista", bodegaId: 5 },
    };
    prisma.sesion.findFirst.mockResolvedValue(sesionOficinistaMock);

    const tokenOficinista = app.jwt.sign({ sesionId: 13 }, { expiresIn: "15m" });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios/entregadores",
      headers: { authorization: `Bearer ${tokenOficinista}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería filtrar entregadores por la bodega del usuario Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);
    prisma.usuario.findMany.mockResolvedValue([
      { id: 20, nombreCompleto: "Repartidor", telefono: "", sedeId: 1 },
    ]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios/entregadores",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(200);
    const arg = prisma.usuario.findMany.mock.calls[0][0];
    expect(arg.where.rol).toBe("Entregador");
    expect(arg.where.OR).toEqual([
      { sedeId: 1 },
      { entregadorSedes: { some: { sedeId: 1 } } },
    ]);
  });

  it("Admin ve todos los entregadores (sin filtro)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findMany.mockResolvedValue([]);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios/entregadores",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    const arg = prisma.usuario.findMany.mock.calls[0][0];
    expect(arg.where.OR).toBeUndefined();
  });
});

// ── GET /api/v1/usuarios/:id ──────────────────────────────────────────────────

describe("GET /api/v1/usuarios/:id", () => {
  it("debería retornar 403 si el rol es Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios/2",
      headers: { authorization: `Bearer ${tokenBodega}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 200 con el usuario encontrado (Admin)", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios/2",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(2);
    expect(res.json().usuario).toBe("clopez");
  });

  it("debería retornar 404 si el usuario no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "GET",
      url: "/api/v1/usuarios/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/no encontrado/i);
  });
});

// ── POST /api/v1/usuarios ─────────────────────────────────────────────────────

describe("POST /api/v1/usuarios", () => {
  it("debería retornar 403 si el rol es Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { authorization: `Bearer ${tokenBodega}` },
      payload: {
        nombreCompleto: "Nuevo",
        usuario: "nuevo",
        correo: "nuevo@test.com",
        contrasena: "pass#123",
        rol: "Bodega",
        sedeId: 1,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 400 si el nombre de usuario ya existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique
      .mockResolvedValueOnce(usuarioMock) // usuario duplicado
      .mockResolvedValueOnce(null); // correo libre

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        nombreCompleto: "Carlos",
        usuario: "clopez",
        correo: "otro@test.com",
        contrasena: "pass#123",
        rol: "Bodega",
        sedeId: 1,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/usuario/i);
  });

  it("debería retornar 400 si el correo ya existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null) // usuario libre
      .mockResolvedValueOnce(usuarioMock); // correo duplicado

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        nombreCompleto: "Carlos",
        usuario: "nuevo",
        correo: "carlos@test.com",
        contrasena: "pass#123",
        rol: "Bodega",
        sedeId: 1,
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/correo/i);
  });

  it("debería retornar 201 al crear un usuario correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null) // usuario libre
      .mockResolvedValueOnce(null); // correo libre
    prisma.sede.findUnique.mockResolvedValue(sedeOficinaMock);
    prisma.usuario.create.mockResolvedValue(usuarioMock);
    prisma.log.create.mockResolvedValue({});

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: {
        nombreCompleto: "Carlos López",
        usuario: "clopez",
        correo: "carlos@test.com",
        contrasena: "pass#123",
        rol: "Bodega",
        sedeId: 6,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().usuario).toBe("clopez");
    expect(res.json()).not.toHaveProperty("clave");
  });

  it("debería retornar 400 si faltan campos requeridos", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/usuarios",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombreCompleto: "Incompleto" },
    });

    expect(res.statusCode).toBe(400);
  });
});

// ── PUT /api/v1/usuarios/:id ──────────────────────────────────────────────────

describe("PUT /api/v1/usuarios/:id", () => {
  it("debería retornar 403 si el rol es Bodega", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionBodegaMock);

    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/usuarios/2",
      headers: { authorization: `Bearer ${tokenBodega}` },
      payload: { nombreCompleto: "Editado" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("debería retornar 404 si el usuario no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/usuarios/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombreCompleto: "No existe" },
    });

    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 al actualizar correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.sede.findUnique.mockResolvedValue(sedeOficinaMock);
    prisma.entregadorSede.deleteMany.mockResolvedValue({ count: 0 });
    prisma.usuario.update.mockResolvedValue({
      ...usuarioMock,
      nombreCompleto: "Carlos Editado",
    });
    prisma.log.create.mockResolvedValue({});

    const res = await app.inject({
      method: "PUT",
      url: "/api/v1/usuarios/2",
      headers: { authorization: `Bearer ${tokenAdmin}` },
      payload: { nombreCompleto: "Carlos Editado" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().nombreCompleto).toBe("Carlos Editado");
  });
});

// ── PATCH /api/v1/usuarios/:id (desactivar) ───────────────────────────────────

describe("PATCH /api/v1/usuarios/:id (desactivar)", () => {
  it("debería retornar 404 si el usuario no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/usuarios/999",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 al desactivar correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.usuario.update.mockResolvedValue({ ...usuarioMock, activo: false });
    prisma.log.create.mockResolvedValue({});

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/usuarios/2",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().activo).toBe(false);
  });
});

// ── PATCH /api/v1/usuarios/:id/activar ───────────────────────────────────────

describe("PATCH /api/v1/usuarios/:id/activar", () => {
  it("debería retornar 404 si el usuario no existe", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique.mockResolvedValue(null);

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/usuarios/999/activar",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it("debería retornar 200 al activar correctamente", async () => {
    prisma.sesion.findFirst.mockResolvedValue(sesionAdminMock);
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuarioMock,
      activo: false,
    });
    prisma.usuario.update.mockResolvedValue({ ...usuarioMock, activo: true });
    prisma.log.create.mockResolvedValue({});

    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/usuarios/2/activar",
      headers: { authorization: `Bearer ${tokenAdmin}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().activo).toBe(true);
  });
});
