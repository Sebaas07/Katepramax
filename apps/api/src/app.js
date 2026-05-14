const Fastify = require("fastify");
const cors = require("@fastify/cors");
const { registrarError } = require("./utils/registrarError");
const { initCronJobs } = require("./tasks/cron");

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: { translateTime: "HH:MM:SS Z", ignore: "pid,hostname" },
    },
  },
});

// ── Plugins ───────────────────────────────────────────────────────────────────
// env debe registrarse primero — valida las variables antes de que cualquier
// otro plugin intente usarlas.
app.register(require("./plugins/env.plugin"));
app.register(cors, { origin: process.env.CORS_ORIGIN || "*" });
app.register(require("./plugins/prisma.plugin"));
app.register(require("./plugins/jwt.plugin"));

// Swagger — comentar en producción si no se quiere exponer la documentación
app.register(require("./plugins/swagger.plugin"));

app.register(require("@fastify/rate-limit"), {
  global: false, // solo donde indiquemos, no en todas las rutas
});

app.register(require("@fastify/helmet"));

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
app.register(require("./routes/inventario.routes"), routePrefix);

// ── Arranque ──────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    // 1. Hook onReady: se dispara cuando Fastify terminó de cargar TODO
    await app.ready();

    // 2. Escuchamos en el puerto
    await app.listen({
      port: parseInt(process.env.PORT) || 3000,
      host: "0.0.0.0",
    });

    // 3. Iniciamos el Cron de forma segura
    initCronJobs(app);
  } catch (err) {
    console.error("DETALLE DEL ERROR:", err);
    app.log.error("Error crítico en el arranque:", err);
    process.exit(1);
  }
};

start();
