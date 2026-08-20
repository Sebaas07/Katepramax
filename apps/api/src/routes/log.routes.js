const ctrl = require("../controllers/log.controller");
const schemas = require("../schemas/log.schema");
const { adminGestion } = require("../middlewares/auth.middleware");

/**
 * log.routes.js
 *
 * GET /logs          → Admin + AdminBogota — historial de acciones
 * GET /logs/acciones → Admin + AdminBogota — tipos de acción (filtro)
 */
async function logRoutes(app) {
  app.get("/logs",
    { schema: schemas.listarLogsSchema, ...adminGestion },
    ctrl.listar,
  );

  app.get("/logs/acciones",
    { schema: schemas.listarAccionesSchema, ...adminGestion },
    ctrl.listarAcciones,
  );
}

module.exports = logRoutes;
