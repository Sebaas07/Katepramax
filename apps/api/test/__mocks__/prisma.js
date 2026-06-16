/**
 * Mock centralizado de PrismaClient.
 * Cubre todos los modelos usados en los tests de integración.
 */
const prisma = {
  usuario: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    updateMany:  vi.fn(),
  },
  sesion: {
    findFirst:   vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    updateMany:  vi.fn(),
    deleteMany:  vi.fn(),
  },
  log: {
    create: vi.fn(),
  },
  cliente: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    aggregate:   vi.fn(),
  },
  producto: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
  },
  proveedor: {
    findUnique:  vi.fn(),
    findFirst:   vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
  },
  inventario: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    upsert:      vi.fn(),
    update:      vi.fn(),
    delete:      vi.fn(),
    groupBy:     vi.fn(),
    aggregate:   vi.fn(),
  },
  stockSede: {
    findUnique:  vi.fn(),
    upsert:      vi.fn(),
    update:      vi.fn(),
    aggregate:   vi.fn(),
  },
  sede: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
  },
  abono: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    delete:      vi.fn(),
    groupBy:     vi.fn(),
  },
  egreso: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    delete:      vi.fn(),
    groupBy:     vi.fn(),
  },
  ingreso: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    delete:      vi.fn(),
    groupBy:     vi.fn(),
  },
  pedido: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
  },
  asignacionEntrega: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
  },
  $transaction: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

module.exports = { prisma };
