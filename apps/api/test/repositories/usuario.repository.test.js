/**
 * Tests unitarios — usuario.repository.js
 */
const { prisma }         = require("../__mocks__/prisma");
const usuarioRepository  = require("../../src/repositories/usuario.repository");

const repo = usuarioRepository(prisma);

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

// ── findByUsuario ─────────────────────────────────────────────────────────────

describe("usuarioRepository.findByUsuario", () => {
  it("debería buscar por campo usuario único e incluir sede", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    const result = await repo.findByUsuario("clopez");

    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { usuario: "clopez" },
      include: { sede: true },
    });
    expect(result.usuario).toBe("clopez");
  });

  it("debería retornar null si no existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const result = await repo.findByUsuario("noexiste");

    expect(result).toBeNull();
  });
});

// ── findByCorreo ──────────────────────────────────────────────────────────────

describe("usuarioRepository.findByCorreo", () => {
  it("debería buscar por correo único", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    await repo.findByCorreo("carlos@test.com");

    expect(prisma.usuario.findUnique).toHaveBeenCalledWith({
      where: { correo: "carlos@test.com" },
    });
  });

  it("debería retornar null si no existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const result = await repo.findByCorreo("noexiste@test.com");

    expect(result).toBeNull();
  });
});

// ── findById ──────────────────────────────────────────────────────────────────

describe("usuarioRepository.findById", () => {
  it("debería buscar por id con select de campos públicos", async () => {
    prisma.usuario.findUnique.mockResolvedValue(usuarioMock);

    const result = await repo.findById(2);

    const callArg = prisma.usuario.findUnique.mock.calls[0][0];
    expect(callArg.where).toEqual({ id: 2 });
    // Debe usar select (no include) para evitar exponer la clave
    expect(callArg).toHaveProperty("select");
    expect(callArg.select).not.toHaveProperty("clave");
    expect(result.id).toBe(2);
  });

  it("debería retornar null si no existe", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);

    const result = await repo.findById(999);

    expect(result).toBeNull();
  });
});

// ── findAll ───────────────────────────────────────────────────────────────────

describe("usuarioRepository.findAll", () => {
  it("debería retornar todos los usuarios con select y ordenados por nombreCompleto", async () => {
    prisma.usuario.findMany.mockResolvedValue([usuarioMock]);

    await repo.findAll();

    expect(prisma.usuario.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { nombreCompleto: "asc" } })
    );

    const callArg = prisma.usuario.findMany.mock.calls[0][0];
    expect(callArg).toHaveProperty("select");
    expect(callArg.select).not.toHaveProperty("clave");
  });
});

// ── create ────────────────────────────────────────────────────────────────────

describe("usuarioRepository.create", () => {
  it("debería llamar prisma.usuario.create con los datos dados", async () => {
    prisma.usuario.create.mockResolvedValue(usuarioMock);

    const data = { usuario: "clopez", correo: "carlos@test.com", clave: "$2b$10$hash", rol: "Bodega", sedeId: 1 };
    await repo.create(data);

    expect(prisma.usuario.create).toHaveBeenCalledWith({ data });
  });
});

// ── update ────────────────────────────────────────────────────────────────────

describe("usuarioRepository.update", () => {
  it("debería actualizar por id con los datos dados", async () => {
    prisma.usuario.update.mockResolvedValue({ ...usuarioMock, nombreCompleto: "Editado" });

    await repo.update(2, { nombreCompleto: "Editado" });

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { nombreCompleto: "Editado" },
    });
  });
});

// ── setActivo ─────────────────────────────────────────────────────────────────

describe("usuarioRepository.setActivo", () => {
  it("debería actualizar activo a false", async () => {
    prisma.usuario.update.mockResolvedValue({ ...usuarioMock, activo: false });

    await repo.setActivo(2, false);

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { activo: false },
    });
  });

  it("debería actualizar activo a true", async () => {
    prisma.usuario.update.mockResolvedValue({ ...usuarioMock, activo: true });

    await repo.setActivo(2, true);

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { activo: true },
    });
  });
});

// ── updateUltimoAcceso ────────────────────────────────────────────────────────

describe("usuarioRepository.updateUltimoAcceso", () => {
  it("debería actualizar ultimoAcceso con la fecha actual", async () => {
    prisma.usuario.update.mockResolvedValue(usuarioMock);

    const antes = Date.now();
    await repo.updateUltimoAcceso(2);
    const despues = Date.now();

    const callData = prisma.usuario.update.mock.calls[0][0].data;
    expect(callData.ultimoAcceso).toBeInstanceOf(Date);
    expect(callData.ultimoAcceso.getTime()).toBeGreaterThanOrEqual(antes);
    expect(callData.ultimoAcceso.getTime()).toBeLessThanOrEqual(despues);
  });
});