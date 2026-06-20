/**
 *
 * Control de roles por endpoint:
 *  POST   /pedidos              → Admin, Bodega, AdminBogota (crean pedidos)
 *  GET    /pedidos              → Admin, Bodega, AdminBogota (ven pedidos de su sede)
 *  GET    /pedidos/:id          → Admin, Bodega, AdminBogota (detalle de un pedido)
 *  GET    /pedidos/:id/historial → Admin, Bodega, AdminBogota (ver historial)
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
    schema:        schemas.crearPedido,
    preValidation: adminOBodega.preValidation,
    handler:       ctrl.crear,
  });

  app.get("/pedidos", {
    schema:        schemas.listarPedidos,
    preValidation: adminOBodega.preValidation,
    handler:       ctrl.listar,
  });

  app.get("/pedidos/:id", {
    schema:        schemas.obtenerPedido,
    preValidation: adminOBodega.preValidation,
    handler:       ctrl.obtenerPorId,
  });

  app.get("/pedidos/:id/historial", {
    preValidation: adminOBodega.preValidation,
    handler:       ctrl.obtenerHistorial,
  });

  // Solo Admin puede cancelar un pedido manualmente
  app.patch("/pedidos/:id/estado", {
    schema:        schemas.cambiarEstadoPedido,
    preValidation: soloAdmin.preValidation,
    handler:       ctrl.cambiarEstado,
  });
}

module.exports = pedidoRoutes;
