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
  entregadorSede: {
    findMany:    vi.fn(),
    create:      vi.fn(),
    createMany:  vi.fn(),
    deleteMany:  vi.fn(),
    delete:      vi.fn(),
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
  skuContador: {
    upsert: vi.fn(),
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
    create:      vi.fn(),   // FIX: faltaba create (service usa repo.crear → prisma.inventario.create)
    upsert:      vi.fn(),
    update:      vi.fn(),
    delete:      vi.fn(),
    groupBy:     vi.fn(),
    aggregate:   vi.fn(),
  },
  stockSede: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    upsert:      vi.fn(),
    update:      vi.fn(),
    aggregate:   vi.fn(),
  },
  sede: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    findFirst:   vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
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
    findFirst:   vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    delete:      vi.fn(),
    deleteMany:  vi.fn(),
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
    count:       vi.fn(),
  },
  pedidoDetalle: {
    findMany: vi.fn(),
  },
  historialEstadoPedido: {
    create:   vi.fn(),
    findMany: vi.fn(),
  },
  asignacionEntrega: {
    findFirst:   vi.fn(),
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    count:       vi.fn(),
  },
  cartera: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    delete:      vi.fn(),
    findFirst:   vi.fn(),
  },
  errorLog: {
    create: vi.fn(),
  },
  envio: {
    findUnique:  vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    count:       vi.fn(),
  },
  envioDetalle: {
    update: vi.fn(),
  },
  // FIX: $transaction ejecuta el callback con el mismo prisma mock
  // para que los tests que usan transacciones funcionen correctamente
  $transaction: vi.fn((cb) => (typeof cb === "function" ? cb(prisma) : Promise.all(cb))),
};

beforeEach(() => {
  vi.clearAllMocks();
  // Restaurar $transaction después de cada clearAllMocks
  prisma.$transaction.mockImplementation((cb) =>
    typeof cb === "function" ? cb(prisma) : Promise.all(cb),
  );
});

module.exports = { prisma };
