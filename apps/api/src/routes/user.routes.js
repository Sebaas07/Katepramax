const { verifyAdmin } = require('../middlewares/auth.middleware');

async function userRoutes(app, options) {
  const userController = require("../controllers/user.controller");

  // Rutas protegidas
  app.get("/api/usuarios", { preHandler: verifyAdmin }, userController.getUsers);
  app.post("/api/usuarios", { preHandler: verifyAdmin }, userController.createUser);
  
  app.put("/api/usuarios/:id", { preHandler: verifyAdmin }, userController.updateUser);
  app.patch("/api/usuarios/:id/activar", { preHandler: verifyAdmin }, userController.activateUser);
  app.patch("/api/usuarios/:id/inactivar", { preHandler: verifyAdmin }, userController.inactivateUser);
}

module.exports = userRoutes;