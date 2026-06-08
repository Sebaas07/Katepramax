

const ctrl    = require("../controllers/egreso.controller");
const schemas = require("../schemas/egreso.schema");
const { adminOBodega, soloAdmin } = require("../middlewares/auth.middleware");

async function egresoRoutes(app) {
  app.get("/egresos/resumen-semanal", { schema: schemas.resumenSemanalEgreso, ...adminOBodega }, ctrl.resumenSemanal);
  app.get("/egresos/resumen-concepto",{ schema: schemas.resumenConcepto,      ...adminOBodega }, ctrl.resumenConcepto);
  app.get("/egresos/totales-dia",     { schema: schemas.totalesDiaEgreso,     ...adminOBodega }, ctrl.totalesDia);

  app.post(  "/egresos",     { schema: schemas.crearEgreso,    ...adminOBodega }, ctrl.crear);
  app.get(   "/egresos",     { schema: schemas.listarEgresos,  ...adminOBodega }, ctrl.listar);
  app.get(   "/egresos/:id", { schema: schemas.obtenerEgreso,  ...adminOBodega }, ctrl.obtenerPorId);
  app.patch( "/egresos/:id", { schema: schemas.editarEgreso,   ...adminOBodega }, ctrl.editar);
  app.delete("/egresos/:id", { schema: schemas.eliminarEgreso, ...soloAdmin    }, ctrl.eliminar);
}

module.exports = egresoRoutes;
