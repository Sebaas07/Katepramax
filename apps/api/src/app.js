require("dotenv").config();
const Fastify = require("fastify");
const cors = require("@fastify/cors");
const { registrarError } = require("./utils/registrarError"); // Importa la función desde utils

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:SS Z", ignore: "pid,hostname" },
    },
  },
});

// ── Plugins ───────────────────────────────────────────────────────────────────
app.register(cors, { origin: process.env.CORS_ORIGIN || "*" });
app.register(require("./plugins/prisma.plugin"));
app.register(require("./plugins/jwt.plugin"));

// ── Error handler global ──────────────────────────────────────────────────────
app.setErrorHandler(async (error, request, reply) => {
  const status = error.statusCode || 500;

  if (status >= 500) {
    request.log.error(error);
    await registrarError(app, error, request);
  }

  // Respuesta al cliente
  return reply.code(status).send({
    error: status === 500 ? "Error interno del servidor" : error.message,
  });
});

// ── Salud ─────────────────────────────────────────────────────────────────────
app.get("/salud", async () => ({ status: "ok", timestamp: new Date() }));

// ── Rutas ─────────────────────────────────────────────────────────────────────
const routePrefix = { prefix: "/api" };
app.register(require("./routes/auth.routes"), routePrefix);
app.register(require("./routes/user.routes"), routePrefix);

// ── Arranque ──────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await app.listen({
      port: parseInt(process.env.PORT) || 3000,
      host: "0.0.0.0",
    });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
