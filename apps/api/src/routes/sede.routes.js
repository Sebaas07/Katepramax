const { verifyToken, requireRole, soloAdmin } = require("../middlewares/auth.middleware");
const ctrl = require("../controllers/sede.controller");
const schemas = require("../schemas/sede.schema");

async function sedeRoutes(app) {
  // Listar sedes — cualquier rol autenticado (los selects de sede la usan)
  app.get("/sedes", {
    schema: schemas.listar,
    preValidation: [verifyToken, requireRole(["Admin", "AdminBogota", "Oficinista", "Bodega", "Entregador"])],
  }, ctrl.listar);

  // Crear sede — solo Admin
  app.post("/sedes", {
    schema:        schemas.crear,
    preValidation: soloAdmin.preValidation,
    handler:       ctrl.crear,
  });

  // Editar sede (renombrar / activar-desactivar) — solo Admin
  app.patch("/sedes/:id", {
    schema:        schemas.editar,
    preValidation: soloAdmin.preValidation,
    handler:       ctrl.editar,
  });
}

module.exports = sedeRoutes;