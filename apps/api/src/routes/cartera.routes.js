const ctrl    = require("../controllers/cartera.controller");
const schemas = require("../schemas/cartera.schema");
const { adminOBodega, soloAdmin } = require("../middlewares/auth.middleware");

async function carteraRoutes(app) {
  app.post(  "/cartera",     { schema: schemas.crearCartera,  ...adminOBodega }, ctrl.crear);
  app.get(   "/cartera",     { schema: schemas.listarCartera, ...adminOBodega }, ctrl.listar);
  app.get(   "/cartera/:id", { schema: schemas.obtenerCartera,...adminOBodega }, ctrl.obtenerPorId);
  app.patch( "/cartera/:id", { schema: schemas.editarCartera, ...adminOBodega }, ctrl.editar);
  app.delete("/cartera/:id", { schema: schemas.eliminarCartera, ...soloAdmin    }, ctrl.eliminar);
}

module.exports = carteraRoutes;
