/**
 *
 * Control de roles:
 *  GET    /proveedores      -> Admin, AdminBogota, Bodega, Oficinista (solo lectura)
 *  GET    /proveedores/:id  -> ídem
 *  POST   /proveedores      -> Admin, AdminBogota, Bodega (Oficinista solo lectura)
 *  PATCH  /proveedores/:id  -> Admin, AdminBogota, Bodega (Oficinista solo lectura)
 *  DELETE /proveedores/:id  -> Admin, AdminBogota
 */

const ctrl    = require("../controllers/proveedor.controller");
const schemas = require("../schemas/proveedor.schema");
const { consultaBodega, adminGestion, adminGestionBodega } = require("../middlewares/auth.middleware");

async function proveedorRoutes(app) {
  app.get("/proveedores",     { schema: schemas.listarProveedores,   ...consultaBodega }, ctrl.listar);
  app.get("/proveedores/:id", { schema: schemas.obtenerProveedor,    ...consultaBodega }, ctrl.obtenerPorId);
  app.post("/proveedores",    { schema: schemas.crearProveedor,      ...adminGestionBodega }, ctrl.crear);
  app.patch("/proveedores/:id",  { schema: schemas.editarProveedor,     ...adminGestionBodega }, ctrl.actualizar);
  app.delete("/proveedores/:id", { schema: schemas.desactivarProveedor, ...adminGestion }, ctrl.desactivar);
}

module.exports = proveedorRoutes;