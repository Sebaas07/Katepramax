const ctrl    = require("../controllers/producto.controller");
const schemas = require("../schemas/producto.schema");
const { consultaBodega, adminOBodega, adminGestion } = require("../middlewares/auth.middleware");

/**
 * producto.routes.js — RBAC.
 *
 * GET    /productos          → Admin, AdminBogota, Bodega (consulta catálogo)
 * GET    /productos/:codigo  → ídem
 * POST   /productos          → Admin, AdminBogota (AdminBogota crea en su sede)
 * PATCH  /productos/:codigo  → Admin, AdminBogota, Bodega (solo productos con stock en su sede)
 * DELETE /productos/:codigo  → Admin, AdminBogota (desactivar)
 */
async function productoRoutes(app) {
  app.get(   "/productos",          { schema: schemas.listarProductos,    ...consultaBodega }, ctrl.listar);
  app.get(   "/productos/:codigo",  { schema: schemas.obtenerProducto,    ...consultaBodega }, ctrl.obtenerPorCodigo);
  app.post(  "/productos",          { schema: schemas.crearProducto,      ...adminGestion    }, ctrl.crear);
  app.patch( "/productos/:codigo",  { schema: schemas.editarProducto,     ...adminOBodega    }, ctrl.editar);
  app.delete("/productos/:codigo",  { schema: schemas.desactivarProducto, ...adminGestion    }, ctrl.desactivar);
}

module.exports = productoRoutes;