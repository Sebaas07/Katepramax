const fp = require("fastify-plugin");

/**
 * Valida que todas las variables de entorno necesarias estén definidas
 * al arrancar la app. Si falta alguna, la app NO inicia.
 *
 * Instalar: npm install @fastify/env
 */
async function envPlugin(app) {
  await app.register(require("@fastify/env"), {
    dotenv: true, // Carga el .env automáticamente (reemplaza el require("dotenv").config() en app.js)
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
