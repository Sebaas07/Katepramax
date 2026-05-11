const authController = require("../controllers/auth.controller");

async function authRoutes(app, options) {
  // Ruta pública: No requiere token
  app.post("/api/auth/login", authController.login);

  // Ruta protegida: Devuelve los datos del usuario dueño del token
  app.get(
    "/api/auth/me",
    {
      // preHandler es el middleware que valida que el token sea correcto
      preHandler: [app.authenticate],
    },
    authController.getMe,
  );
}

module.exports = authRoutes;
