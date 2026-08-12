const ctrl    = require("../controllers/abono.controller");
const schemas = require("../schemas/abono.schema");
const { adminGestion, adminOBodega, soloAdmin } = require("../middlewares/auth.middleware");

async function abonoRoutes(app) {
  // Estáticas primero
  app.get("/abonos/resumen-proveedor", { schema: schemas.resumenProveedor, ...adminGestion }, ctrl.resumenProveedor);
  app.get("/abonos/resumen-sede",      { schema: schemas.resumenSede,      ...adminGestion }, ctrl.resumenSede);

  // Registrar/consultar abonos — Admin + AdminBogota + Bodega (Bodega solo su propia sede,
  // filtro aplicado en abono.service.js)
  app.post(  "/abonos",     { schema: schemas.crearAbono,    ...adminOBodega }, ctrl.crear);
  app.get(   "/abonos",     { schema: schemas.listarAbonos,  ...adminOBodega }, ctrl.listar);
  app.get(   "/abonos/:id", { schema: schemas.obtenerAbono,  ...adminOBodega }, ctrl.obtenerPorId);
  app.patch( "/abonos/:id", { schema: schemas.editarAbono,   ...adminOBodega }, ctrl.editar);
  app.delete("/abonos/:id", { schema: schemas.eliminarAbono, ...soloAdmin    }, ctrl.eliminar);
}

module.exports = abonoRoutes;