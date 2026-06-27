const { adminOBodega, verifyToken, requireRole } = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/sede.controller");
const schemas = require("../schemas/sede.schema");

async function sedeRoutes(app) {
  app.get("/sedes", {
    schema: schemas.listar,
    preValidation: [verifyToken, requireRole(["Admin", "Bodega", "AdminBogota", "Entregador"])],
  }, ctrl.listar);
}

module.exports = sedeRoutes;
