const { login, me, cambiarClave } = require("../controllers/auth.controller");
const { verifyToken } = require("../middlewares/auth.middleware");

async function authRoutes(app) {
  app.post("/auth/login", login);
  app.get("/auth/me", { preHandler: [verifyToken] }, me);
  app.patch("/auth/clave", { preHandler: [verifyToken] }, cambiarClave);
}

module.exports = authRoutes;
