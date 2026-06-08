

const ctrl    = require("../controllers/producto.controller");
const schemas = require("../schemas/producto.schema");
const { adminOBodega, soloAdmin } = require("../middlewares/auth.middleware");

/**
 * producto.routes.js — RBAC corregido
 *
 * GET    /productos          → Admin, Bodega  (consultar catálogo)
 * GET    /productos/:codigo  → Admin, Bodega
 * POST   /productos          → solo Admin     (crear producto es decisión estratégica)
 * PATCH  /productos/:codigo  → Admin, Bodega  (bodega puede actualizar precios/stock)
 * DELETE /productos/:codigo  → solo Admin     (desactivar)
 */
async function productoRoutes(app) {
  app.get(   "/productos",          { schema: schemas.listarProductos,    ...adminOBodega }, ctrl.listar);
  app.get(   "/productos/:codigo",  { schema: schemas.obtenerProducto,    ...adminOBodega }, ctrl.obtenerPorCodigo);
  app.post(  "/productos",          { schema: schemas.crearProducto,      ...soloAdmin    }, ctrl.crear);
  app.patch( "/productos/:codigo",  { schema: schemas.editarProducto,     ...adminOBodega }, ctrl.editar);
  app.delete("/productos/:codigo",  { schema: schemas.desactivarProducto, ...soloAdmin    }, ctrl.desactivar);
}

module.exports = productoRoutes;
