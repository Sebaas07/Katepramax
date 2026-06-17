const fp = require("fastify-plugin");

/**
 * Plugin que inyecta Prisma como decorador en la instancia de Fastify.
 * Al usar fastify-plugin se evita el encapsulamiento y prisma queda
 * disponible en toda la app via app.prisma o request.server.prisma.
 */
async function prismaPlugin(app) {
  // En modo test los tests reemplazan app.prisma con el mock manualmente
  // después de buildApp(). Evitamos instanciar PrismaClient porque los
  // binarios generados no están disponibles en el entorno de test.
  if (process.env.NODE_ENV === "test") {
    app.decorate("prisma", {});
    return;
  }

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

  await prisma.$connect();
  app.decorate("prisma", prisma);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
}

module.exports = fp(prismaPlugin, { name: "prisma" });
