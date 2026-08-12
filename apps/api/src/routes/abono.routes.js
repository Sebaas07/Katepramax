const ctrl    = require("../controllers/abono.controller");
const schemas = require("../schemas/abono.schema");
const { adminGestion, soloAdmin } = require("../middlewares/auth.middleware");

async function abonoRoutes(app) {
  // Estáticas primero
  app.get("/abonos/resumen-proveedor", { schema: schemas.resumenProveedor, ...adminGestion }, ctrl.resumenProveedor);
  app.get("/abonos/resumen-sede",      { schema: schemas.resumenSede,      ...adminGestion }, ctrl.resumenSede);

  app.post(  "/abonos",     { schema: schemas.crearAbono,    ...adminGestion }, ctrl.crear);
  app.get(   "/abonos",     { schema: schemas.listarAbonos,  ...adminGestion }, ctrl.listar);
  app.get(   "/abonos/:id", { schema: schemas.obtenerAbono,  ...adminGestion }, ctrl.obtenerPorId);
  app.patch( "/abonos/:id", { schema: schemas.editarAbono,   ...adminGestion }, ctrl.editar);
  app.delete("/abonos/:id", { schema: schemas.eliminarAbono, ...soloAdmin    }, ctrl.eliminar);
}

module.exports = abonoRoutes;