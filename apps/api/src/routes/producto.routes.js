const ctrl    = require("../controllers/producto.controller");
const schemas = require("../schemas/producto.schema");
const { consultaBodega, adminGestion, soloAdmin } = require("../middlewares/auth.middleware");

/**
 * producto.routes.js — RBAC.
 *
 * GET    /productos          → Admin, AdminBogota, Bodega (consulta catálogo)
 * GET    /productos/:codigo  → ídem
 * POST   /productos          → solo Admin
 * PATCH  /productos/:codigo  → Admin, AdminBogota
 * DELETE /productos/:codigo  → solo Admin (desactivar)
 */
async function productoRoutes(app) {
  app.get(   "/productos",          { schema: schemas.listarProductos,    ...consultaBodega }, ctrl.listar);
  app.get(   "/productos/:codigo",  { schema: schemas.obtenerProducto,    ...consultaBodega }, ctrl.obtenerPorCodigo);
  app.post(  "/productos",          { schema: schemas.crearProducto,      ...soloAdmin      }, ctrl.crear);
  app.patch( "/productos/:codigo",  { schema: schemas.editarProducto,     ...adminGestion   }, ctrl.editar);
  app.delete("/productos/:codigo",  { schema: schemas.desactivarProducto, ...soloAdmin      }, ctrl.desactivar);
}

module.exports = productoRoutes;