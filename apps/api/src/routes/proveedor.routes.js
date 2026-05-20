/**
 *
 * Control de roles:
 *  GET    /proveedores      -> Admin, Bodega  
 *  GET    /proveedores/:id  -> Admin, Bodega
 *  POST   /proveedores      -> solo Admin  
 *  PATCH  /proveedores/:id  -> solo Admin    
 *  DELETE /proveedores/:id  -> solo Admin   
 */

const ctrl    = require("../controllers/proveedor.controller");
const schemas = require("../schemas/proveedor.schema");
const { adminOBodega, soloAdmin } = require("../middlewares/auth.middleware");

async function proveedorRoutes(app) {
  app.get("/proveedores",     { schema: schemas.listarProveedores,   ...adminOBodega }, ctrl.listar);
  app.get("/proveedores/:id", { schema: schemas.obtenerProveedor,    ...adminOBodega }, ctrl.obtenerPorId);
  app.post("/proveedores",    { schema: schemas.crearProveedor,      ...soloAdmin    }, ctrl.crear);
  app.patch("/proveedores/:id",  { schema: schemas.editarProveedor,     ...soloAdmin }, ctrl.actualizar);
  app.delete("/proveedores/:id", { schema: schemas.desactivarProveedor, ...soloAdmin }, ctrl.desactivar);
}

module.exports = proveedorRoutes;
