/**
 * Tests unitarios — usuario.service.js
 */
const bcrypt = require("bcrypt");
const { prisma } = require("./__mocks__/prisma");

vi.mock("../src/utils/logger", () => ({
  registrarAccion: vi.fn().mockResolvedValue(undefined),
}));

const usuarioService = require("../src/services/usuario.service");

const appMock = { prisma };
const svc = usuarioService(appMock);

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

// Sede tipo Bodega y activa (validarSede la exige para crear/editar usuarios)
const sedeBodegaMock = { id: 1, nombre: "Bodega Principal", tipo: "Bodega", activo: true };

// ── getAll ────────────────────────────────────────────────────────────────────

describe("usuarioService.getAll", () => {
  it("debería retornar todos los usuarios", async () => {
    prisma.usuario.findMany.mockResolvedValue([usuarioMock]);

    const result = await svc.getAll();

    expect(result).toHaveLength(1);
    expect(result[0].usuario).toBe("clopez");
  });
});

// ── getById ───────────────────────────────────────────────────────────────────

describe("usuarioService.getById", () => {
  it("debería retornar el usuario si existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    const result = await svc.getById(2);

    expect(result.id).toBe(2);
  });

  it("debería lanzar AppError 404 si no existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(svc.getById(999)).rejects.toMatchObject({
      statusCode: 404,
      message: expect.stringMatching(/no encontrado/i),
    });
  });
});

// ── create ────────────────────────────────────────────────────────────────────

describe("usuarioService.create", () => {
  it("debería lanzar AppError 400 si el nombre de usuario ya existe", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(usuarioMock) // usuario duplicado
      .mockResolvedValueOnce(null);

    await expect(
      svc.create(
        {
          nombreCompleto: "Nuevo",
          usuario: "clopez",
          correo: "nuevo@test.com",
          contrasena: "pass123",
          rol: "Bodega",
          sedeId: 1,
        },
        1,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/usuario/i),
    });
  });

  it("debería lanzar AppError 400 si el correo ya está registrado", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null) // usuario libre
      .mockResolvedValueOnce(usuarioMock); // correo duplicado

    await expect(
      svc.create(
        {
          nombreCompleto: "Nuevo",
          usuario: "nuevo",
          correo: "carlos@test.com",
          contrasena: "pass123",
          rol: "Bodega",
          sedeId: 1,
        },
        1,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/correo/i),
    });
  });

  it("debería hashear la contraseña antes de guardar", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);
    prisma.usuario.create.mockResolvedValue(usuarioMock);
    prisma.log.create.mockResolvedValue({});

    await svc.create(
      {
        nombreCompleto: "Nuevo",
        usuario: "nuevo",
        correo: "nuevo@test.com",
        contrasena: "pass123",
        rol: "Bodega",
        sedeId: 1,
      },
      1,
    );

    const callData = prisma.usuario.create.mock.calls[0][0].data;
    // La clave guardada debe ser un hash bcrypt, no el texto plano
    expect(callData.clave).toBeDefined();
    expect(callData.clave).not.toBe("pass123");
    expect(callData.clave.startsWith("$2b$")).toBe(true);
  });

  it("no debería incluir contrasena en los datos creados", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);
    prisma.usuario.create.mockResolvedValue(usuarioMock);
    prisma.log.create.mockResolvedValue({});

    await svc.create(
      {
        nombreCompleto: "Nuevo",
        usuario: "nuevo",
        correo: "nuevo@test.com",
        contrasena: "pass123",
        rol: "Bodega",
        sedeId: 1,
      },
      1,
    );

    const callData = prisma.usuario.create.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty("contrasena");
  });

  it("debería retornar solo campos públicos (sin clave)", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);
    prisma.usuario.create.mockResolvedValue({
      ...usuarioMock,
      clave: "$2b$10$hash...",
    });
    prisma.log.create.mockResolvedValue({});

    const result = await svc.create(
      {
        nombreCompleto: "Carlos López",
        usuario: "clopez",
        correo: "carlos@test.com",
        contrasena: "pass123",
        rol: "Bodega",
        sedeId: 1,
      },
      1,
    );

    expect(result).not.toHaveProperty("clave");
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("usuario");
    expect(result).toHaveProperty("rol");
  });

  it("debería convertir sedeId a entero", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);
    prisma.usuario.create.mockResolvedValue(usuarioMock);
    prisma.log.create.mockResolvedValue({});

    await svc.create(
      {
        nombreCompleto: "Nuevo",
        usuario: "nuevo",
        correo: "nuevo@test.com",
        contrasena: "pass123",
        rol: "Bodega",
        sedeId: "1",
      },
      1,
    );

    const callData = prisma.usuario.create.mock.calls[0][0].data;
    expect(typeof callData.sedeId).toBe("number");
    expect(callData.sedeId).toBe(1);
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe("usuarioService.update", () => {
  it("debería lanzar AppError 404 si el usuario no existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(
      svc.update(999, { nombreCompleto: "Editado" }, 1),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("debería actualizar solo campos permitidos", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);
    prisma.entregadorSede.deleteMany.mockResolvedValue({ count: 0 });
    prisma.usuario.update.mockResolvedValue({
      ...usuarioMock,
      nombreCompleto: "Editado",
    });
    prisma.log.create.mockResolvedValue({});

    await svc.update(
      2,
      { nombreCompleto: "Editado", campoExtra: "ignorar", clave: "hack" },
      1,
    );

    const callData = prisma.usuario.update.mock.calls[0][0].data;
    expect(callData).toHaveProperty("nombreCompleto", "Editado");
    expect(callData).not.toHaveProperty("campoExtra");
    expect(callData).not.toHaveProperty("clave"); // no se puede pasar clave directamente
  });

  it("debería hashear la nueva contraseña si se pasa contrasena", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);
    prisma.entregadorSede.deleteMany.mockResolvedValue({ count: 0 });
    prisma.usuario.update.mockResolvedValue(usuarioMock);
    prisma.log.create.mockResolvedValue({});

    await svc.update(2, { contrasena: "nuevaClave123" }, 1);

    const callData = prisma.usuario.update.mock.calls[0][0].data;
    expect(callData.clave).toBeDefined();
    expect(callData.clave.startsWith("$2b$")).toBe(true);
    expect(callData.clave).not.toBe("nuevaClave123");
  });

  it("no debería incluir clave si no se pasa contrasena", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);
    prisma.entregadorSede.deleteMany.mockResolvedValue({ count: 0 });
    prisma.usuario.update.mockResolvedValue(usuarioMock);
    prisma.log.create.mockResolvedValue({});

    await svc.update(2, { nombreCompleto: "Sin clave" }, 1);

    const callData = prisma.usuario.update.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty("clave");
  });
});

// ── setActivo ─────────────────────────────────────────────────────────────────

describe("usuarioService.setActivo", () => {
  it("debería lanzar AppError 404 si el usuario no existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    await expect(svc.setActivo(999, false, 1)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("debería actualizar activo a false (desactivar)", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);
    prisma.usuario.update.mockResolvedValue({ ...usuarioMock, activo: false });
    prisma.log.create.mockResolvedValue({});

    await svc.setActivo(2, false, 1);

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { activo: false },
    });
  });

  it("debería actualizar activo a true (activar)", async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      ...usuarioMock,
      activo: false,
    });
    prisma.usuario.update.mockResolvedValue({ ...usuarioMock, activo: true });
    prisma.log.create.mockResolvedValue({});

    await svc.setActivo(2, true, 1);

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { activo: true },
    });
  });
});

// ── getEntregadores (filtro por bodega) ───────────────────────────────────────

describe("usuarioService.getEntregadores", () => {
  it("Admin ve todos los entregadores (sin filtro)", async () => {
    prisma.usuario.findMany.mockResolvedValue([
      { id: 10, nombreCompleto: "Repartidor A", rol: "Entregador" },
    ]);

    await svc.getEntregadores({ rol: "Admin", sedeId: 1 });

    const arg = prisma.usuario.findMany.mock.calls[0][0];
    expect(arg.where.rol).toBe("Entregador");
    expect(arg.where.OR).toBeUndefined();
  });

  it("Bodega filtra entregadores por su bodega (sedeId + tabla puente)", async () => {
    prisma.usuario.findMany.mockResolvedValue([]);

    await svc.getEntregadores({ rol: "Bodega", sedeId: 5 });

    const arg = prisma.usuario.findMany.mock.calls[0][0];
    expect(arg.where.OR).toEqual([
      { sedeId: 5 },
      { entregadorSedes: { some: { sedeId: 5 } } },
    ]);
  });

  it("Oficinista filtra por la bodega de su oficina (bodegaId)", async () => {
    prisma.usuario.findMany.mockResolvedValue([]);

    await svc.getEntregadores({ rol: "Oficinista", sedeId: 7, bodegaId: 5 });

    const arg = prisma.usuario.findMany.mock.calls[0][0];
    expect(arg.where.OR).toEqual([
      { sedeId: 5 },
      { entregadorSedes: { some: { sedeId: 5 } } },
    ]);
  });
});

// ── create / update con Entregador multi-bodega ───────────────────────────────

describe("usuarioService con Entregador multi-bodega", () => {
  const entregadorMock = { ...usuarioMock, id: 3, rol: "Entregador", sedeId: 1 };

  it("create de Entregador registra todas las bodegas en la tabla puente", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock); // sede principal 1
    prisma.sede.findMany.mockResolvedValue([
      { id: 1 },
      { id: 2 },
      { id: 3 },
    ]); // validación de bodegas extra
    prisma.usuario.create.mockResolvedValue(entregadorMock);
    prisma.log.create.mockResolvedValue({});

    await svc.create(
      {
        nombreCompleto: "Repartidor",
        usuario: "repartidor",
        correo: "repartidor@test.com",
        contrasena: "pass123",
        rol: "Entregador",
        sedeId: 1,
        sedesIds: [2, 3],
      },
      1,
    );

    const data = prisma.entregadorSede.createMany.mock.calls[0][0].data;
    expect(data).toEqual(
      expect.arrayContaining([
        { entregadorId: 3, sedeId: 1 },
        { entregadorId: 3, sedeId: 2 },
        { entregadorId: 3, sedeId: 3 },
      ]),
    );
  });

  it("create de Entregador exige bodegas válidas (tipo Bodega)", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);
    prisma.sede.findMany.mockResolvedValue([{ id: 1 }]); // falta la 99

    await expect(
      svc.create(
        {
          nombreCompleto: "Repartidor",
          usuario: "repartidor2",
          correo: "repartidor2@test.com",
          contrasena: "pass123",
          rol: "Entregador",
          sedeId: 1,
          sedesIds: [99],
        },
        1,
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("update de Entregador sincroniza la tabla puente", async () => {
    prisma.usuario.findUnique.mockResolvedValue(entregadorMock);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);
    prisma.sede.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.entregadorSede.deleteMany.mockResolvedValue({ count: 2 });
    prisma.usuario.update.mockResolvedValue(entregadorMock);
    prisma.log.create.mockResolvedValue({});

    await svc.update(3, { rol: "Entregador", sedeId: 1, sedesIds: [2] }, 1);

    expect(prisma.entregadorSede.deleteMany).toHaveBeenCalledWith({
      where: { entregadorId: 3 },
    });
    const data = prisma.entregadorSede.createMany.mock.calls[0][0].data;
    expect(data).toEqual([
      { entregadorId: 3, sedeId: 1 },
      { entregadorId: 3, sedeId: 2 },
    ]);
  });

  it("update de Entregador conserva sus bodegas si no se envían sedesIds", async () => {
    const entregadorConSedes = {
      ...entregadorMock,
      entregadorSedes: [{ sedeId: 1 }, { sedeId: 2 }, { sedeId: 3 }],
    };
    prisma.usuario.findUnique.mockResolvedValue(entregadorConSedes);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);
    prisma.sede.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
    prisma.entregadorSede.deleteMany.mockResolvedValue({ count: 3 });
    prisma.usuario.update.mockResolvedValue(entregadorConSedes);
    prisma.log.create.mockResolvedValue({});

    // Solo cambia el nombre; no llegan sedesIds
    await svc.update(3, { nombreCompleto: "Repartidor Editado" }, 1);

    const data = prisma.entregadorSede.createMany.mock.calls[0][0].data;
    expect(data).toEqual(
      expect.arrayContaining([
        { entregadorId: 3, sedeId: 1 },
        { entregadorId: 3, sedeId: 2 },
        { entregadorId: 3, sedeId: 3 },
      ]),
    );
  });

  it("create de Bodega rechaza una sede de tipo Oficina", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.sede.findUnique.mockResolvedValue({
      id: 8,
      tipo: "Oficina",
      activo: true,
    });

    await expect(
      svc.create(
        {
          nombreCompleto: "Nuevo",
          usuario: "bodegaoficina",
          correo: "bodegaoficina@test.com",
          contrasena: "pass123",
          rol: "Bodega",
          sedeId: 8,
        },
        1,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/bodega/i),
    });
  });

  it("create de Oficinista rechaza una sede de tipo Bodega", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.sede.findUnique.mockResolvedValue(sedeBodegaMock);

    await expect(
      svc.create(
        {
          nombreCompleto: "Nuevo",
          usuario: "oficinistabodega",
          correo: "oficinistabodega@test.com",
          contrasena: "pass123",
          rol: "Oficinista",
          sedeId: 1,
        },
        1,
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/oficina/i),
    });
  });

  it("create de AdminBogota acepta cualquier tipo de sede", async () => {
    prisma.usuario.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.sede.findUnique.mockResolvedValue({
      id: 8,
      tipo: "Oficina",
      activo: true,
    });
    prisma.usuario.create.mockResolvedValue({
      ...usuarioMock,
      rol: "AdminBogota",
      sedeId: 8,
    });
    prisma.log.create.mockResolvedValue({});

    const result = await svc.create(
      {
        nombreCompleto: "Admin Bogotá",
        usuario: "abogota",
        correo: "abogota@test.com",
        contrasena: "pass123",
        rol: "AdminBogota",
        sedeId: 8,
      },
      1,
    );

    expect(result.rol).toBe("AdminBogota");
  });
});
