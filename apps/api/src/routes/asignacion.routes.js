const ctrl    = require("../controllers/asignacion.controller");
const schemas = require("../schemas/asignacion.schema");
const {
  verifyToken,
  requireRole,
  verEntregas,
  asignarEntregador,
} = require("../middlewares/auth.middleware");

async function asignacionRoutes(app) {

  // Crear asignación — Admin, AdminBogota y Bodega
  // (Bodega/Admin asignan el pedido a un entregador desde la bodega; Oficinista NO)
  app.post("/asignaciones", {
    schema:        schemas.crearAsignacion,
    preValidation: asignarEntregador.preValidation,
    handler:       ctrl.crear,
  });

  // Listar entregas — Admin, AdminBogota, Oficinista y Bodega (solo lectura)
  app.get("/asignaciones", {
    schema:        schemas.listarAsignaciones,
    preValidation: verEntregas.preValidation,
    handler:       ctrl.listar,
  });

  // Mis entregas — cualquier rol autenticado (el servicio filtra por usuario)
  app.get("/asignaciones/mis-entregas", {
    schema:        schemas.misEntregas,
    preValidation: [verifyToken],
    handler:       ctrl.misEntregas,
  });

  // Obtener una — Admin, AdminBogota, Oficinista, Bodega y el propio Entregador
  app.get("/asignaciones/:id", {
    schema:        schemas.obtenerAsignacion,
    preValidation: [verifyToken],
    handler:       ctrl.obtenerPorId,
  });

  // Actualizar estado — Entregador (sus propias) o Admin/AdminBogota
  app.patch("/asignaciones/:id/estado", {
    schema:        schemas.actualizarEstado,
    preValidation: [verifyToken, requireRole(["Admin", "AdminBogota", "Entregador"])],
    handler:       ctrl.actualizarEstado,
  });
}

module.exports = asignacionRoutes;