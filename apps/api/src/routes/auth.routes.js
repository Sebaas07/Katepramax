const { login, refresh, logout, me, cambiarClave } = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");
const { loginBody, refreshBody, cambiarClaveBody, tokenPair } = require("../schemas/auth.schema");

async function authRoutes(app) {
  // POST /api/auth/login
  app.post("/auth/login", {
    schema: {
      summary: "Iniciar sesión",
      tags: ["Auth"],
      body: loginBody,
      response: { 200: tokenPair },
    },
    handler: login,
  });

  // POST /api/auth/refresh
  app.post("/auth/refresh", {
    schema: {
      summary: "Renovar access token usando el refresh token",
      tags: ["Auth"],
      body: refreshBody,
      response: { 200: tokenPair },
    },
    handler: refresh,
  });

  // POST /api/auth/logout  (requiere access token válido)
  app.post("/auth/logout", {
    schema: {
      summary: "Cerrar sesión (revoca la sesión en BD)",
      tags: ["Auth"],
    },
    preHandler: [verifyToken],
    handler: logout,
  });

  // GET /api/auth/me
  app.get("/auth/me", {
    schema: {
      summary: "Obtener datos del usuario autenticado",
      tags: ["Auth"],
    },
    preHandler: [verifyToken],
    handler: me,
  });

  // PATCH /api/auth/clave
  app.patch("/auth/clave", {
    schema: {
      summary: "Cambiar contraseña (cierra todas las sesiones activas)",
      tags: ["Auth"],
      body: cambiarClaveBody,
    },
    preHandler: [verifyToken],
    handler: cambiarClave,
  });
}

module.exports = authRoutes;
