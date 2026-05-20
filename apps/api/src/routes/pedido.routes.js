/**
 *
 * Control de roles por endpoint:
 *  POST   /pedidos              → Admin, Bodega  (crean pedidos)
 *  GET    /pedidos              → Admin, Bodega  (ven todos los pedidos)
 *  GET    /pedidos/:id          → Admin, Bodega  (detalle de un pedido)
 *  PATCH  /pedidos/:id/estado   → solo Admin     (única acción manual = Cancelar)
 *
 * La transición Pendiente -> Asignado -> Entregado se gestiona desde /asignaciones.
 */

const ctrl    = require("../controllers/pedido.controller");
const schemas = require("../schemas/pedido.schema");
const {
  verifyToken,
  requireRole,
  adminOBodega,
  soloAdmin,
} = require("../middlewares/auth.middleware");

async function pedidoRoutes(app) {
  app.post("/pedidos", {
    schema:     schemas.crearPedido,
    preHandler: adminOBodega.preHandler,
    handler:    ctrl.crear,
  });

  app.get("/pedidos", {
    schema:     schemas.listarPedidos,
    preHandler: adminOBodega.preHandler,
    handler:    ctrl.listar,
  });

  app.get("/pedidos/:id", {
    schema:     schemas.obtenerPedido,
    preHandler: adminOBodega.preHandler,
    handler:    ctrl.obtenerPorId,
  });

  // Solo Admin puede cancelar un pedido manualmente
  app.patch("/pedidos/:id/estado", {
    schema:     schemas.cambiarEstadoPedido,
    preHandler: soloAdmin.preHandler,
    handler:    ctrl.cambiarEstado,
  });
}

module.exports = pedidoRoutes;
