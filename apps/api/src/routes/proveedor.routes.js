/**
 *
 * Control de roles:
 *  GET    /proveedores      -> Admin, AdminBogota, Bodega (solo lectura)
 *  GET    /proveedores/:id  -> ídem
 *  POST   /proveedores      -> solo Admin
 *  PATCH  /proveedores/:id  -> solo Admin
 *  DELETE /proveedores/:id  -> solo Admin
 */

const ctrl    = require("../controllers/proveedor.controller");
const schemas = require("../schemas/proveedor.schema");
const { consultaBodega, soloAdmin } = require("../middlewares/auth.middleware");

async function proveedorRoutes(app) {
  app.get("/proveedores",     { schema: schemas.listarProveedores,   ...consultaBodega }, ctrl.listar);
  app.get("/proveedores/:id", { schema: schemas.obtenerProveedor,    ...consultaBodega }, ctrl.obtenerPorId);
  app.post("/proveedores",    { schema: schemas.crearProveedor,      ...soloAdmin    }, ctrl.crear);
  app.patch("/proveedores/:id",  { schema: schemas.editarProveedor,     ...soloAdmin }, ctrl.actualizar);
  app.delete("/proveedores/:id", { schema: schemas.desactivarProveedor, ...soloAdmin }, ctrl.desactivar);
}

module.exports = proveedorRoutes;