const ctrl    = require("../controllers/abono.controller");
const schemas = require("../schemas/abono.schema");
const { adminGestion, carteraProveedores, gestion } = require("../middlewares/auth.middleware");

async function abonoRoutes(app) {
  // Estáticas primero — resúmenes: Admin + AdminBogota + Oficinista (sede propia)
  app.get("/abonos/resumen-proveedor", { schema: schemas.resumenProveedor, ...gestion }, ctrl.resumenProveedor);
  app.get("/abonos/resumen-sede",      { schema: schemas.resumenSede,      ...gestion }, ctrl.resumenSede);

  // Registrar/consultar abonos — Admin + AdminBogota + Oficinista (solo su propia sede,
  // filtro aplicado en abono.service.js)
  app.post(  "/abonos",     { schema: schemas.crearAbono,    ...carteraProveedores }, ctrl.crear);
  app.get(   "/abonos",     { schema: schemas.listarAbonos,  ...carteraProveedores }, ctrl.listar);
  app.get(   "/abonos/:id", { schema: schemas.obtenerAbono,  ...carteraProveedores }, ctrl.obtenerPorId);
  app.patch( "/abonos/:id", { schema: schemas.editarAbono,   ...carteraProveedores }, ctrl.editar);
  app.delete("/abonos/:id", { schema: schemas.eliminarAbono, ...adminGestion  }, ctrl.eliminar);
}

module.exports = abonoRoutes;