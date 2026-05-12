/**
 * verifyToken — verifica JWT y adjunta el usuario a request.user
 */
const verifyToken = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: "No autorizado. Token inválido o expirado." });
  }
};

/**
 * requireRole(roles[]) — factory que devuelve un preHandler de rol.
 * Siempre se usa DESPUÉS de verifyToken.
 * Uso: preHandler: [verifyToken, requireRole(["Admin", "Bodega"])]
 */
const requireRole = (roles) => async (request, reply) => {
  if (!roles.includes(request.user?.rol)) {
    return reply.code(403).send({ error: `Acceso denegado. Se requiere rol: ${roles.join(" o ")}.` });
  }
};

// Atajos semánticos
const soloAdmin          = [verifyToken, requireRole(["Admin"])];
const adminOBodega       = [verifyToken, requireRole(["Admin", "Bodega"])];
const todosLosRoles      = [verifyToken];

module.exports = { verifyToken, requireRole, soloAdmin, adminOBodega, todosLosRoles };
