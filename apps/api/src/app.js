require("dotenv").config();

const Fastify = require("fastify");
const cors = require("@fastify/cors");
const jwt = require("@fastify/jwt");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const app = Fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:SS Z",
        ignore: "pid,hostname",
      },
    },
  },
});

// 1. CORS
app.register(cors, {
  origin: process.env.CORS_ORIGIN || "*",
});

// 2. Si no hay secret, el servidor falla con mensaje claro
if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET no está definido en el archivo .env");
  process.exit(1);
}

app.register(jwt, {
  secret: process.env.JWT_SECRET,
});

// 3. Prisma decorado en la instancia
app.decorate("prisma", prisma);

app.addHook("onClose", async (instance) => {
  await instance.prisma.$disconnect();
});

// Ruta de salud
app.get("/api/salud", async (request, reply) => {
  return {
    status: "ok",
    message: "Servidor de Abarrotes PDV (Katepramax) funcionando correctamente",
  };
});

app.register(require("./routes/user.routes"));
app.register(require("./routes/auth.routes"));

const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
