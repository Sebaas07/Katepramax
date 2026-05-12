const { login, me, cambiarClave } = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const {
  loginBody,
  cambiarClaveBody,
  loginResponse,
} = require("../schemas/auth.schema");

async function authRoutes(app) {
  // POST /api/auth/login
  app.post("/auth/login", {
    schema: {
      summary: "Iniciar sesión",
      tags: ["Auth"],
      body: loginBody,
      response: loginResponse,
    },
    handler: login,
  });

  // GET /api/auth/me
  app.get("/auth/me", {
    schema: {
      summary: "Obtener usuario autenticado",
      tags: ["Auth"],
    },
    preHandler: [verifyToken],
    handler: me,
  });

  // PATCH /api/auth/clave
  app.patch("/auth/clave", {
    schema: {
      summary: "Cambiar contraseña",
      tags: ["Auth"],
      body: cambiarClaveBody,
    },
    preHandler: [verifyToken],
    handler: cambiarClave,
  });
}

module.exports = authRoutes;
