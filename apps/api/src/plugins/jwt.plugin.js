const fp = require("fastify-plugin");
const fastifyJwt = require("@fastify/jwt");

/**
 * Plugin JWT. Registra el plugin oficial de Fastify y falla explícitamente
 * si JWT_SECRET no está en el entorno — nunca un fallback hardcodeado.
 */
async function jwtPlugin(app) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    app.log.fatal("JWT_SECRET no configurado en el entorno.");
    throw new Error("FATAL: JWT_SECRET no definido.");
  }

  app.register(fastifyJwt, {
    secret: secret,
    // Configuración recomendada:
    messages: {
      badRequestErrorMessage: "Formato de token incorrecto.",
      noAuthorizationInHeaderMessage:
        "No se proporcionó cabecera de autorización.",
      authorizationTokenExpiredMessage: "El token ha expirado.",
      authorizationTokenInvalid: "El token de autorización es inválido.",
    },
  });

  // Decorador útil para usar en otras partes de la app
  app.decorate("signToken", (payload, options = {}) => {
    return app.jwt.sign(payload, options);
  });
}

module.exports = fp(jwtPlugin, { name: "jwt" });
