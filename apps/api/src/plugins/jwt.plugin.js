const fp = require("fastify-plugin");
const fastifyJwt = require("@fastify/jwt");

/**
 * Plugin JWT. Registra el plugin oficial de Fastify y falla explícitamente
 * si JWT_SECRET no está en el entorno — nunca un fallback hardcodeado.
 */
async function jwtPlugin(app) {
  if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET no está definido en el archivo .env");
  }

  app.register(fastifyJwt, {
    secret: process.env.JWT_SECRET,
  });
}

module.exports = fp(jwtPlugin, { name: "jwt" });
