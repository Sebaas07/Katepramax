// Cargar variables de entorno
require("dotenv").config();

const Fastify = require("fastify");
const cors = require("@fastify/cors");
const jwt = require("@fastify/jwt");
const { PrismaClient } = require("@prisma/client");

// Instanciar Prisma
const prisma = new PrismaClient();

// Crear la instancia de Fastify con logger
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

// 1. Configuración de CORS
app.register(cors, {
  origin: process.env.CORS_ORIGIN || "*",
});

// 2. Configuración de JWT
app.register(jwt, {
  secret: process.env.JWT_SECRET || "WAOSPRUEBASECRET",
});

// 3. Decorar la aplicación con Prisma para usarlo en cualquier ruta o controlador
app.decorate("prisma", prisma);

// Cerrar la conexión de la base de datos al detener la aplicación
app.addHook("onClose", async (instance) => {
  await instance.prisma.$disconnect();
});

// Ruta de prueba/salud para verificar que el servidor funciona
app.get("/api/salud", async (request, reply) => {
  return {
    status: "ok",
    message: "Servidor de Abarrotes PDV (Katepramax) funcionando correctamente",
  };
});

app.register(require("./routes/user.routes"));
app.register(require("./routes/auth.routes"));

// Función para iniciar el servidor
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
