const Fastify = require("fastify");
const cors = require("@fastify/cors");
const { registrarError } = require("./utils/registrarError");

async function buildApp() {
  // Desactivamos el logger visual si estamos corriendo tests
  const esTest = process.env.NODE_ENV === "test";

  const app = Fastify({
    logger: esTest
      ? false
      : {
          transport: {
            target: "pino-pretty",
            options: { translateTime: "HH:MM:SS Z", ignore: "pid,hostname" },
          },
        },
  });

  // ── Plugins ───────────────────────────────────────────────────────────────────
  app.register(require("./plugins/env.plugin"));
  app.register(cors, { origin: process.env.CORS_ORIGIN || "*" });
  app.register(require("./plugins/prisma.plugin"));
  app.register(require("./plugins/jwt.plugin"));

  // Swagger — comentar en producción si no se quiere exponer la documentación
  app.register(require("./plugins/swagger.plugin"));
  app.register(require("@fastify/rate-limit"), { global: false });
  app.register(require("@fastify/helmet"));

  // ── Error handler global ──────────────────────────────────────────────────────
  app.setErrorHandler(async (error, request, reply) => {
    const status = error.statusCode || 500;
    if (status >= 500) {
      request.log.error(error);
      await registrarError(app, error, request);
    }
    return reply.code(status).send({
      error: status === 500 ? "Error interno del servidor" : error.message,
    });
  });

  // ── Salud ─────────────────────────────────────────────────────────────────────
  app.get("/salud", async () => ({ status: "ok", timestamp: new Date() }));

  // ── Rutas ─────────────────────────────────────────────────────────────────────
  const routePrefix = { prefix: "/api/v1" };

  // Módulos existentes
  app.register(require("./routes/auth.routes"), routePrefix);
  app.register(require("./routes/user.routes"), routePrefix);
  app.register(require("./routes/producto.routes"), routePrefix);
  app.register(require("./routes/inventario.routes"), routePrefix);
  app.register(require("./routes/pedido.routes"), routePrefix);
  app.register(require("./routes/cliente.routes"), routePrefix);
  app.register(require("./routes/asignacion.routes"), routePrefix);
  app.register(require("./routes/proveedor.routes"), routePrefix);

  // Módulos nuevos (contabilidad)
  app.register(require("./routes/ingreso.routes"), routePrefix);
  app.register(require("./routes/egreso.routes"), routePrefix);
  app.register(require("./routes/cartera.routes"), routePrefix);
  app.register(require("./routes/abono.routes"), routePrefix);
  app.register(require("./routes/reporte.routes"), routePrefix);

  return app;
}

module.exports = { buildApp };
