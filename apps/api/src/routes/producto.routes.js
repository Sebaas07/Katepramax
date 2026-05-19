const ctrl    = require("../controllers/producto.controller");
const schemas = require("../schemas/producto.schema");
const { verifyToken } = require("../middlewares/auth.middleware");

async function productoRoutes(app) {
  app.addHook("preHandler", verifyToken);

  app.post("/productos",         { schema: schemas.crearProducto },     ctrl.crear);
  app.get("/productos",          { schema: schemas.listarProductos },    ctrl.listar);
  app.get("/productos/:codigo",  { schema: schemas.obtenerProducto },    ctrl.obtenerPorCodigo);
  app.patch("/productos/:codigo",{ schema: schemas.editarProducto },     ctrl.editar);
  app.delete("/productos/:codigo",{ schema: schemas.desactivarProducto },ctrl.desactivar);
}

module.exports = productoRoutes;
