const sesionRepository = require("../repositories/sesion.repository");
const AppError = require("../errors/AppError");

/**
 * Middleware para verificar el token y validar la sesión contra la BD.
 */
const verifyToken = async (request, reply) => {
  try {
    // 1. Verificar firma del JWT
    await request.jwtVerify();
  } catch (err) {
    // Lanzar error en lugar de enviar respuesta directamente
    throw new AppError("Token inválido o expirado.", 401);
  }

  const { sesionId } = request.user;

  // 2. Usar el repositorio (inyectando prisma desde la instancia de fastify)
  const sesRepo = sesionRepository(request.server.prisma);

  // Optimizamos la consulta trayendo solo lo necesario (usuario y su estado)
  const sesion = await sesRepo.findById(sesionId);

  // 3. Validaciones críticas
  if (!sesion) {
    throw new AppError("Sesión inexistente o revocada.", 401);
  }

  if (!sesion.usuario || !sesion.usuario.activo) {
    throw new AppError("El usuario ya no tiene acceso al sistema.", 401);
  }

  // 4. Sobreescribir request.user con datos REALES de la BD
  request.user = {
    id: sesion.usuario.id,
    usuario: sesion.usuario.usuario,
    rol: sesion.usuario.rol,
    sedeId: sesion.usuario.sedeId,
    sesionId: sesion.id,
  };
};

/**
 * Validador de roles (RBAC)
 */
const requireRole = (roles) => async (request, reply) => {
  // Verificamos que verifyToken ya haya corrido (request.user existe)
  if (!request.user || !roles.includes(request.user.rol)) {
    throw new AppError(
      "No tienes permisos suficientes para realizar esta acción.",
      403,
    );
  }
};

// Exportación de esquemas de protección.
// Se usa preValidation (en lugar de preHandler) para que la autenticación
// se ejecute ANTES de la validación del body por Fastify. Así un request
// sin token devuelve 401 y no 400, incluso si el body está incompleto.
module.exports = {
  verifyToken,
  requireRole,
  soloAdmin: { preValidation: [verifyToken, requireRole(["Admin"])] },
  adminOBodega: {
    preValidation: [verifyToken, requireRole(["Admin", "Bodega"])],
  },
  todos: { preValidation: [verifyToken] },
};
