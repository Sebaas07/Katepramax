

const ctrl    = require("../controllers/reporte.controller");
const schemas = require("../schemas/reporte.schema");
const { soloAdmin, adminOBodega } = require("../middlewares/auth.middleware");

/**
 * reporte.routes.js
 *
 * GET /api/v1/reportes/arqueo-semanal?semana=N   → solo Admin
 * GET /api/v1/reportes/panel-general?fecha=YYYY  → Admin y Bodega
 * GET /api/v1/reportes/historial-semanal         → solo Admin
 */
async function reporteRoutes(app) {
  app.get("/reportes/arqueo-semanal",  { schema: schemas.arqueoSemanalSchema,   ...soloAdmin    }, ctrl.arqueoSemanal);
  app.get("/reportes/panel-general",   { schema: schemas.panelGeneralSchema,    ...adminOBodega }, ctrl.panelGeneral);
  app.get("/reportes/historial-semanal",{ schema: schemas.historialSemanalSchema, ...soloAdmin  }, ctrl.historialSemanal);
}

module.exports = reporteRoutes;
