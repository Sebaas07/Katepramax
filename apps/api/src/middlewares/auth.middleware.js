const sesionRepository = require("../repositories/sesion.repository");

/**
 * Middleware para verificar el token y validar la sesión contra la BD.
 */
const verifyToken = async (request, reply) => {
  try {
    // 1. Verificar firma del JWT
    await request.jwtVerify();
  } catch (err) {
    return reply.code(401).send({ error: "Token inválido o expirado." });
  }

  const { sesionId } = request.user;

  // 2. Usar el repositorio (inyectando prisma desde la instancia de fastify)
  const sesRepo = sesionRepository(request.server.prisma);

  // Optimizamos la consulta trayendo solo lo necesario (usuario y su estado)
  const sesion = await sesRepo.findById(sesionId);

  // 3. Validaciones críticas
  if (!sesion) {
    return reply.code(401).send({ error: "Sesión inexistente o revocada." });
  }

  if (!sesion.usuario || !sesion.usuario.activo) {
    return reply
      .code(401)
      .send({ error: "El usuario ya no tiene acceso al sistema." });
  }

  // 4. Sobreescribir request.user con datos REALES de la BD
  // Esto previene que un cambio de rol en el panel administrativo sea ignorado por el token
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
    return reply.code(403).send({
      error: "No tienes permisos suficientes para realizar esta acción.",
      required: roles,
    });
  }
};

// Exportación de esquemas de protección
module.exports = {
  verifyToken,
  requireRole,
  soloAdmin: { preHandler: [verifyToken, requireRole(["Admin"])] },
  adminOBodega: { preHandler: [verifyToken, requireRole(["Admin", "Bodega"])] },
  todos: { preHandler: [verifyToken] },
};
