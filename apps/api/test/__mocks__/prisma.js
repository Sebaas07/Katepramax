/**
 * Mock centralizado de PrismaClient.
 * Cada modelo expone las funciones de Prisma como vi.fn() para que
 * cada test pueda configurar lo que retorna con .mockResolvedValue().
 */

const prisma = {
  usuario: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  sesion: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  cliente: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  log: {
    create: vi.fn(),
  },
};

// Limpia todos los mocks antes de cada test automáticamente
beforeEach(() => {
  vi.clearAllMocks();
});

module.exports = { prisma };
