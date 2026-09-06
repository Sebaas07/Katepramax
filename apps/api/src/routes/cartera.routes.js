const ctrl    = require("../controllers/cartera.controller");
const schemas = require("../schemas/cartera.schema");
const { adminGestion, gestion } = require("../middlewares/auth.middleware");

async function carteraRoutes(app) {
  // Cartera (registro diario de la sede) — Admin + AdminBogota + Oficinista (solo su sede).
  // El borrado es sensible y queda reservado a Admin + AdminBogota.
  app.post(  "/cartera",     { schema: schemas.crearCartera,  ...gestion }, ctrl.crear);
  app.get(   "/cartera",     { schema: schemas.listarCartera, ...gestion }, ctrl.listar);
  app.get(   "/cartera/:id", { schema: schemas.obtenerCartera,...gestion }, ctrl.obtenerPorId);
  app.patch( "/cartera/:id", { schema: schemas.editarCartera, ...gestion }, ctrl.editar);
  app.delete("/cartera/:id", { schema: schemas.eliminarCartera, ...adminGestion  }, ctrl.eliminar);
}

module.exports = carteraRoutes;