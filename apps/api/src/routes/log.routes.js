const ctrl = require("../controllers/log.controller");
const schemas = require("../schemas/log.schema");
const { soloAdmin } = require("../middlewares/auth.middleware");

/**
 * log.routes.js
 *
 * GET /logs          → solo Admin — historial de acciones de los usuarios
 * GET /logs/acciones → solo Admin — tipos de acción distintos (para el filtro)
 */
async function logRoutes(app) {
  app.get("/logs",
    { schema: schemas.listarLogsSchema, ...soloAdmin },
    ctrl.listar,
  );

  app.get("/logs/acciones",
    { schema: schemas.listarAccionesSchema, ...soloAdmin },
    ctrl.listarAcciones,
  );
}

module.exports = logRoutes;
