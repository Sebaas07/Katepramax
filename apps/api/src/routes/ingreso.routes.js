const ctrl    = require("../controllers/ingreso.controller");
const schemas = require("../schemas/ingreso.schema");
const { adminGestion, soloAdmin } = require("../middlewares/auth.middleware");

async function ingresoRoutes(app) {
  app.get("/ingresos/resumen-semanal", { schema: schemas.resumenSemanalIngreso, ...adminGestion }, ctrl.resumenSemanal);
  app.get("/ingresos/totales-dia",     { schema: schemas.totalesDiaIngreso,     ...adminGestion }, ctrl.totalesDia);

  app.post(  "/ingresos",     { schema: schemas.crearIngreso,    ...adminGestion }, ctrl.crear);
  app.get(   "/ingresos",     { schema: schemas.listarIngresos,  ...adminGestion }, ctrl.listar);
  app.get(   "/ingresos/:id", { schema: schemas.obtenerIngreso,  ...adminGestion }, ctrl.obtenerPorId);
  app.patch( "/ingresos/:id", { schema: schemas.editarIngreso,   ...adminGestion }, ctrl.editar);
  app.delete("/ingresos/:id", { schema: schemas.eliminarIngreso, ...soloAdmin    }, ctrl.eliminar);
}

module.exports = ingresoRoutes;