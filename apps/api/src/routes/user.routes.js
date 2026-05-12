const {
  getAll,
  getById,
  create,
  update,
  desactivar,
  activar,
} = require("../controllers/user.controller");
const { soloAdmin } = require("../middlewares/auth.middleware");

async function userRoutes(app) {
  app.get("/usuarios", { preHandler: soloAdmin }, getAll);
  app.get("/usuarios/:id", { preHandler: soloAdmin }, getById);
  app.post("/usuarios", { preHandler: soloAdmin }, create);
  app.put("/usuarios/:id", { preHandler: soloAdmin }, update);
  app.patch("/usuarios/:id", { preHandler: soloAdmin }, desactivar);
  app.patch("/usuarios/:id/activar", { preHandler: soloAdmin }, activar);
}

module.exports = userRoutes;
