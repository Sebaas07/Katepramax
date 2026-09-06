const ctrl    = require("../controllers/reporte.controller");
const schemas = require("../schemas/reporte.schema");
const { adminGestion, consultaBodega, gestion } = require("../middlewares/auth.middleware");

/**
 * reporte.routes.js
 *
 * GET /reportes/arqueo-semanal    → Admin + AdminBogota + Oficinista (solo oficinas; cada quien su sede)
 * GET /reportes/panel-general     → Admin + AdminBogota + Bodega + Oficinista (filtro de sede automático)
 * GET /reportes/cobros-entregador → Admin + AdminBogota + Bodega + Oficinista (reporte de entregas)
 * GET /reportes/corte-caja        → Admin + AdminBogota + Bodega + Oficinista
 */
async function reporteRoutes(app) {
  app.get("/reportes/arqueo-semanal",
    { schema: schemas.arqueoSemanalSchema, ...gestion },
    ctrl.arqueoSemanal,
  );

  // Bodega solo ve su sede; Admin puede filtrar con ?sedeId=
  app.get("/reportes/panel-general",
    { schema: schemas.panelGeneralSchema, ...consultaBodega },
    ctrl.panelGeneral,
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