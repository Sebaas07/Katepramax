const ctrl    = require("../controllers/reporte.controller");
const schemas = require("../schemas/reporte.schema");
const { soloAdmin, consultaBodega } = require("../middlewares/auth.middleware");

/**
 * reporte.routes.js
 *
 * GET /reportes/arqueo-semanal    → solo Admin
 * GET /reportes/panel-general     → Admin + AdminBogota + Bodega (con filtro de sede automático)
 * GET /reportes/historial-semanal → solo Admin
 * GET /reportes/cobros-entregador → Admin + AdminBogota + Bodega (reporte de entregas)
 * GET /reportes/corte-caja        → Admin + AdminBogota + Bodega
 */
async function reporteRoutes(app) {
  app.get("/reportes/arqueo-semanal",
    { schema: schemas.arqueoSemanalSchema, ...soloAdmin },
    ctrl.arqueoSemanal,
  );

  // Bodega solo ve su sede; Admin puede filtrar con ?sedeId=
  app.get("/reportes/panel-general",
    { schema: schemas.panelGeneralSchema, ...consultaBodega },
    ctrl.panelGeneral,
  );

  app.get("/reportes/historial-semanal",
    { schema: schemas.historialSemanalSchema, ...soloAdmin },
    ctrl.historialSemanal,
  );

  app.get("/reportes/cobros-entregador",
    { schema: schemas.cobrosPorEntregadorSchema, ...consultaBodega },
    ctrl.cobrosPorEntregador,
  );

  // corte-caja: ganancia (recaudo entregadores) vs gasto (egresos) en un rango
  app.get("/reportes/corte-caja",
    { schema: schemas.corteCajaSchema, ...consultaBodega },
    ctrl.corteCaja,
  );
}

module.exports = reporteRoutes;