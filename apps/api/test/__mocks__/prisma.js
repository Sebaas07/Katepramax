/**
 * Mock centralizado de PrismaClient.
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
  log: {
    create: vi.fn(),
  },
  cliente: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  producto: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  proveedor: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  inventario: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    groupBy: vi.fn(),
  },
  stockSede: {
    upsert: vi.fn(),
    update: vi.fn(),
  },
  sede: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

module.exports = { prisma };
