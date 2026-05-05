// Middleware para verificar si el token es válido
const authenticate = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply
      .code(401)
      .send({ error: "No autorizado. Token inválido o expirado." });
  }
};

// Middleware para verificar si el rol del usuario está permitido
const requireRole = (allowedRoles) => {
  return async (request, reply) => {
    const user = request.user; // El usuario se guarda en request.user tras el jwtVerify

    if (!user || !allowedRoles.includes(user.rol)) {
      return reply.code(403).send({
        error: "Acceso denegado. No tienes permisos para esta acción.",
      });
    }
  };
};

module.exports = {
  authenticate,
  requireRole,
};
