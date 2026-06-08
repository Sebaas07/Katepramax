

const ctrl    = require("../controllers/abono.controller");
const schemas = require("../schemas/abono.schema");
const { adminOBodega, soloAdmin } = require("../middlewares/auth.middleware");

async function abonoRoutes(app) {
  // Estáticas primero
  app.get("/abonos/resumen-proveedor", { schema: schemas.resumenProveedor, ...adminOBodega }, ctrl.resumenProveedor);
  app.get("/abonos/resumen-sede",      { schema: schemas.resumenSede,      ...adminOBodega }, ctrl.resumenSede);

  app.post(  "/abonos",     { schema: schemas.crearAbono,    ...adminOBodega }, ctrl.crear);
  app.get(   "/abonos",     { schema: schemas.listarAbonos,  ...adminOBodega }, ctrl.listar);
  app.get(   "/abonos/:id", { schema: schemas.obtenerAbono,  ...adminOBodega }, ctrl.obtenerPorId);
  app.patch( "/abonos/:id", { schema: schemas.editarAbono,   ...adminOBodega }, ctrl.editar);
  app.delete("/abonos/:id", { schema: schemas.eliminarAbono, ...soloAdmin    }, ctrl.eliminar);
}

module.exports = abonoRoutes;
