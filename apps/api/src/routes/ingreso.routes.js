const ctrl    = require("../controllers/ingreso.controller");
const schemas = require("../schemas/ingreso.schema");
const { adminGestion, adminOBodega, gestion } = require("../middlewares/auth.middleware");

async function ingresoRoutes(app) {
  // Resúmenes de contabilidad — Admin + AdminBogota + Oficinista (sede propia)
  app.get("/ingresos/resumen-semanal", { schema: schemas.resumenSemanalIngreso, ...gestion }, ctrl.resumenSemanal);
  app.get("/ingresos/totales-dia",     { schema: schemas.totalesDiaIngreso,     ...gestion }, ctrl.totalesDia);

  // Admin, AdminBogota, Bodega y Oficinista (cada uno solo su propia sede)
  app.post(  "/ingresos",     { schema: schemas.crearIngreso,    ...adminOBodega }, ctrl.crear);
  app.get(   "/ingresos",     { schema: schemas.listarIngresos,  ...adminOBodega }, ctrl.listar);
  app.get(   "/ingresos/:id", { schema: schemas.obtenerIngreso,  ...adminOBodega }, ctrl.obtenerPorId);
  app.patch( "/ingresos/:id", { schema: schemas.editarIngreso,   ...adminOBodega }, ctrl.editar);
  app.delete("/ingresos/:id", { schema: schemas.eliminarIngreso, ...adminGestion  }, ctrl.eliminar);
}

module.exports = ingresoRoutes;