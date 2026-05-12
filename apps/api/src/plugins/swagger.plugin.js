const fp = require("fastify-plugin");

/**
 * Plugin de Swagger — genera documentación automática a partir de los schemas
 * de las rutas. Disponible en http://localhost:PORT/docs
 *
 * Instalar: npm install @fastify/swagger @fastify/swagger-ui
 */
async function swaggerPlugin(app) {
  await app.register(require("@fastify/swagger"), {
    openapi: {
      info: {
        title: "Katepramax API",
        description: "Documentación de la API",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await app.register(require("@fastify/swagger-ui"), {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "list", deepLinking: false },
  });
}

module.exports = fp(swaggerPlugin, { name: "swagger" });
