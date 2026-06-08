

const ctrl    = require("../controllers/ingreso.controller");
const schemas = require("../schemas/ingreso.schema");
const { adminOBodega, soloAdmin } = require("../middlewares/auth.middleware");

async function ingresoRoutes(app) {
  app.get("/ingresos/resumen-semanal", { schema: schemas.resumenSemanalIngreso, ...adminOBodega }, ctrl.resumenSemanal);
  app.get("/ingresos/totales-dia",     { schema: schemas.totalesDiaIngreso,     ...adminOBodega }, ctrl.totalesDia);

  app.post(  "/ingresos",     { schema: schemas.crearIngreso,    ...adminOBodega }, ctrl.crear);
  app.get(   "/ingresos",     { schema: schemas.listarIngresos,  ...adminOBodega }, ctrl.listar);
  app.get(   "/ingresos/:id", { schema: schemas.obtenerIngreso,  ...adminOBodega }, ctrl.obtenerPorId);
  app.patch( "/ingresos/:id", { schema: schemas.editarIngreso,   ...adminOBodega }, ctrl.editar);
  app.delete("/ingresos/:id", { schema: schemas.eliminarIngreso, ...soloAdmin    }, ctrl.eliminar);
}

module.exports = ingresoRoutes;
