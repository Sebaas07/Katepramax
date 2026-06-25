const fp = require("fastify-plugin");

/**
 * Valida que todas las variables de entorno necesarias estén definidas
 * al arrancar la app. Si falta alguna, la app NO inicia.
 *
 * Instalar: npm install @fastify/env
 */
async function envPlugin(app) {
  await app.register(require("@fastify/env"), {
    // En tests Vitest ya cargó .env.test — dejar dotenv: true haría que
    // @fastify/env cargue el .env del proyecto encima, pisando las variables
    // de prueba y causando un Hook timeout en beforeAll.
    dotenv: process.env.NODE_ENV !== "test",
    schema: {
      type: "object",
      required: ["DATABASE_URL", "JWT_SECRET", "PORT"],
      properties: {
        DATABASE_URL: { type: "string" },
        JWT_SECRET: { type: "string", minLength: 16 },
        PORT: { type: "string", default: "3000" },
        CORS_ORIGIN: { type: "string", default: "*" },
      },
    },
  });
}

module.exports = fp(envPlugin, { name: "env" });
