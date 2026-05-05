async function authRoutes(app, options) {
  const authController = require("../controllers/auth.controller");
  app.post("/api/auth/login", authController.login);
}

module.exports = authRoutes;
