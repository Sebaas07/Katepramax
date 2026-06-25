const ctrl    = require("../controllers/reporte.controller");
const schemas = require("../schemas/reporte.schema");
const { soloAdmin, adminOBodega } = require("../middlewares/auth.middleware");

/**
 * reporte.routes.js
 *
 * GET /reportes/arqueo-semanal    → solo Admin
 * GET /reportes/panel-general     → Admin + Bodega (con filtro de sede automático)
 * GET /reportes/historial-semanal → solo Admin
 */
async function reporteRoutes(app) {
  app.get("/reportes/arqueo-semanal",
    { schema: schemas.arqueoSemanalSchema, ...soloAdmin },
    ctrl.arqueoSemanal,
  );

  // panel-general: Bodega solo ve su sede; Admin puede filtrar con ?sedeId=
  app.get("/reportes/panel-general",
    { schema: schemas.panelGeneralSchema, ...adminOBodega },
    ctrl.panelGeneral,
  );

  app.get("/reportes/historial-semanal",
    { schema: schemas.historialSemanalSchema, ...soloAdmin },
    ctrl.historialSemanal,
  );
}

module.exports = reporteRoutes;
