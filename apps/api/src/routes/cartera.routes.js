const ctrl    = require("../controllers/cartera.controller");
const schemas = require("../schemas/cartera.schema");
const { adminGestion, soloAdmin } = require("../middlewares/auth.middleware");

async function carteraRoutes(app) {
  app.post(  "/cartera",     { schema: schemas.crearCartera,  ...adminGestion }, ctrl.crear);
  app.get(   "/cartera",     { schema: schemas.listarCartera, ...adminGestion }, ctrl.listar);
  app.get(   "/cartera/:id", { schema: schemas.obtenerCartera,...adminGestion }, ctrl.obtenerPorId);
  app.patch( "/cartera/:id", { schema: schemas.editarCartera, ...adminGestion }, ctrl.editar);
  app.delete("/cartera/:id", { schema: schemas.eliminarCartera, ...soloAdmin  }, ctrl.eliminar);
}

module.exports = carteraRoutes;