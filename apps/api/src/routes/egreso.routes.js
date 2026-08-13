const ctrl    = require("../controllers/egreso.controller");
const schemas = require("../schemas/egreso.schema");
const { consultaBodega, adminOBodega, soloAdmin } = require("../middlewares/auth.middleware");

async function egresoRoutes(app) {
  // Lectura — Bodega los usa desde el reporte de gastos diarios
  app.get("/egresos/resumen-semanal", { schema: schemas.resumenSemanalEgreso, ...consultaBodega }, ctrl.resumenSemanal);
  app.get("/egresos/resumen-concepto",{ schema: schemas.resumenConcepto,      ...consultaBodega }, ctrl.resumenConcepto);
  app.get("/egresos/totales-dia",     { schema: schemas.totalesDiaEgreso,     ...consultaBodega }, ctrl.totalesDia);
  app.get("/egresos",                 { schema: schemas.listarEgresos,        ...consultaBodega }, ctrl.listar);
  app.get("/egresos/:id",             { schema: schemas.obtenerEgreso,        ...consultaBodega }, ctrl.obtenerPorId);

  // Escritura — Admin, AdminBogota y Bodega (Bodega solo su propia sede)
  app.post(  "/egresos",     { schema: schemas.crearEgreso,    ...adminOBodega }, ctrl.crear);
  app.patch( "/egresos/:id", { schema: schemas.editarEgreso,   ...adminOBodega }, ctrl.editar);
  app.delete("/egresos/:id", { schema: schemas.eliminarEgreso, ...soloAdmin    }, ctrl.eliminar);
}

module.exports = egresoRoutes;