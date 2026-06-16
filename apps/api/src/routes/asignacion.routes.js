const ctrl    = require("../controllers/asignacion.controller");
const schemas = require("../schemas/asignacion.schema");
const {
  verifyToken,
  requireRole,
  adminOBodega,
} = require("../middlewares/auth.middleware");

async function asignacionRoutes(app) {

  // Crear asignación — solo Bodega y Admin
  app.post("/asignaciones", {
    schema:        schemas.crearAsignacion,
    preValidation: adminOBodega.preValidation,
    handler:       ctrl.crear,
  });

  // Listar todas — Bodega y Admin
  app.get("/asignaciones", {
    schema:        schemas.listarAsignaciones,
    preValidation: adminOBodega.preValidation,
    handler:       ctrl.listar,
  });

  // Mis entregas — cualquier rol autenticado (el servicio filtra por usuario)
  app.get("/asignaciones/mis-entregas", {
    schema:        schemas.misEntregas,
    preValidation: [verifyToken],
    handler:       ctrl.misEntregas,
  });

  // Obtener una — Bodega, Admin y el propio Entregador
  app.get("/asignaciones/:id", {
    schema:        schemas.obtenerAsignacion,
    preValidation: [verifyToken],
    handler:       ctrl.obtenerPorId,
  });

  // Actualizar estado — Entregador (sus propias) o Bodega/Admin
  app.patch("/asignaciones/:id/estado", {
    schema:        schemas.actualizarEstado,
    preValidation: [verifyToken, requireRole(["Admin", "Bodega", "Entregador"])],
    handler:       ctrl.actualizarEstado,
  });
}

module.exports = asignacionRoutes;
