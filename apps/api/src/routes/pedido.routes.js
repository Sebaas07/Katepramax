const ctrl    = require("../controllers/pedido.controller");
const schemas = require("../schemas/pedido.schema");
const { verifyToken } = require("../middlewares/auth.middleware");

async function pedidoRoutes(app) {
  app.addHook("preHandler", verifyToken);

  app.post("/pedidos",                 { schema: schemas.crearPedido },        ctrl.crear);
  app.get("/pedidos",                  { schema: schemas.listarPedidos },       ctrl.listar);
  app.get("/pedidos/:id",              { schema: schemas.obtenerPedido },       ctrl.obtenerPorId);
  app.patch("/pedidos/:id/estado",     { schema: schemas.cambiarEstadoPedido }, ctrl.cambiarEstado);
}

module.exports = pedidoRoutes;
