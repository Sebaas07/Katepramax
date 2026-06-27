const fp = require("fastify-plugin");

/**
 * Plugin que inyecta Prisma como decorador en la instancia de Fastify.
 * Al usar fastify-plugin se evita el encapsulamiento y prisma queda
 * disponible en toda la app via app.prisma o request.server.prisma.
 */

/**
 * Convierte recursivamente cualquier instancia de Prisma.Decimal dentro de
 * un resultado (objeto, array o valor escalar) a un number plano.
 *
 * Por qué hace falta: los campos `Decimal` del schema (montoCobrado,
 * precioUnitario, subtotal, totalRecibido, costoUnitario, precioVenta, etc.)
 * Prisma los devuelve como objetos Decimal.js, NO como number. Los schemas
 * de respuesta de Fastify (fast-json-stringify) los declaran como
 * `{ type: "number" }`, y como Decimal.js no es un number primitivo,
 * fast-json-stringify lanza una excepción al serializar (500), no los
 * descarta silenciosamente como hace con propiedades no declaradas.
 */
function convertirDecimals(Prisma, valor) {
  if (valor instanceof Prisma.Decimal) return valor.toNumber();
  if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length; i++) {
      valor[i] = convertirDecimals(Prisma, valor[i]);
    }
    return valor;
  }
  if (valor !== null && typeof valor === "object" && !(valor instanceof Date)) {
    for (const clave of Object.keys(valor)) {
      valor[clave] = convertirDecimals(Prisma, valor[clave]);
    }
    return valor;
  }
  return valor;
}

async function prismaPlugin(app) {
  // En modo test los tests reemplazan app.prisma con el mock manualmente
  // después de buildApp(). Evitamos instanciar PrismaClient porque los
  // binarios generados no están disponibles en el entorno de test.
  if (process.env.NODE_ENV === "test") {
    app.decorate("prisma", {});
    return;
  }

  const { PrismaClient, Prisma } = require("@prisma/client");
  const prismaBase = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

  // Extensión global: cualquier Decimal que devuelva CUALQUIER query
  // (en cualquier modelo, dentro o fuera de $transaction) sale convertido
  // a number antes de llegar a controllers/services.
  const prisma = prismaBase.$extends({
    name: "decimal-a-number",
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const resultado = await query(args);
          return convertirDecimals(Prisma, resultado);
        },
      },
    },
  });

  await prismaBase.$connect();
  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prismaBase.$disconnect();
  });
}

module.exports = fp(prismaPlugin, { name: "prisma" });
