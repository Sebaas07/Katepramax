/**
 *
 * Control de roles por endpoint:
 *  POST   /pedidos              → Admin, AdminBogota, Oficinista (crean pedidos)
 *  GET    /pedidos              → Admin, AdminBogota, Oficinista (gestión) +
 *                                 Bodega (solo lectura, vista entregas)
 *  GET    /pedidos/:id          → ídem (detalle de un pedido)
 *  GET    /pedidos/:id/historial → ídem (ver historial)
 *  PATCH  /pedidos/:id/estado   → solo Admin     (única acción manual = Cancelar)
 *
 * La transición Pendiente -> Asignado -> Entregado se gestiona desde /asignaciones.
 */

const ctrl    = require("../controllers/pedido.controller");
const schemas = require("../schemas/pedido.schema");
const {
  gestion,
  consultaBodega,
  soloAdmin,
} = require("../middlewares/auth.middleware");

async function pedidoRoutes(app) {
  app.post("/pedidos", {
    schema:        schemas.crearPedido,
    preValidation: gestion.preValidation,
    handler:       ctrl.crear,
  });

  app.get("/pedidos", {
    schema:        schemas.listarPedidos,
    preValidation: consultaBodega.preValidation,
    handler:       ctrl.listar,
  });

  app.get("/pedidos/:id", {
    schema:        schemas.obtenerPedido,
    preValidation: consultaBodega.preValidation,
    handler:       ctrl.obtenerPorId,
  });

  app.get("/pedidos/:id/historial", {
    preValidation: consultaBodega.preValidation,
    handler:       ctrl.obtenerHistorial,
  });

  // PÚBLICA (sin sesión): la usa el código QR del ticket de factura para
  // validar el documento. Contiene solo los campos de un comprobante.
  app.get("/pedidos/:id/factura", {
    schema:  schemas.obtenerFactura,
    handler: ctrl.obtenerFactura,
  });

  // Solo Admin puede cancelar un pedido manualmente
  app.patch("/pedidos/:id/estado", {
    schema:        schemas.cambiarEstadoPedido,
    preValidation: soloAdmin.preValidation,
    handler:       ctrl.cambiarEstado,
  });
}

module.exports = pedidoRoutes;
