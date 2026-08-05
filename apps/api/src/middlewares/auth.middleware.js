const sesionRepository = require("../repositories/sesion.repository");
const AppError = require("../errors/AppError");

/**
 * auth.middleware.js
 * Centraliza autenticación + RBAC + filtro de sede.
 * Todas las rutas protegidas pasan por aquí antes de llegar al controlador.
 */

// ── 1. Verificar JWT y sesión en BD ───────────────────────────
const verifyToken = async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError("Token inválido o expirado.", 401);
  }

  const { sesionId } = request.user;
  const sesRepo = sesionRepository(request.server.prisma);
  const sesion  = await sesRepo.findById(sesionId);

  if (!sesion)                          throw new AppError("Sesión inexistente o revocada.", 401);
  if (!sesion.usuario?.activo)          throw new AppError("El usuario ya no tiene acceso al sistema.", 401);

  await sesRepo.actualizarExpiracion(sesion.id);

  if (request.cookies?.refreshToken) {
    reply.setCookie("refreshToken", request.cookies.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 15 * 60,
      path: "/api/v1",
    });
  }

  // Sobreescribir con datos REALES de la BD — nunca confiar en el payload del JWT
  request.user = {
    id:       sesion.usuario.id,
    usuario:  sesion.usuario.usuario,
    rol:      sesion.usuario.rol,
    sedeId:   sesion.usuario.sedeId,
    sesionId: sesion.id,
  };
};

// ── 2. RBAC ───────────────────────────────────────────────────
const requireRole = (roles) => {
  const permitidos = new Set(roles);
  return async (request) => {
    if (!request.user || !permitidos.has(request.user.rol)) {
      throw new AppError("No tienes permisos suficientes para realizar esta acción.", 403);
    }
  };
};

// ── 3. Filtro de sede centralizado ────────────────────────────
/**
 * Inyecta request.sedeFilter para que los controladores/servicios
 * lo usen directamente, garantizando consistencia en toda la app.
 *
 * Admin        → {}                      (ve todo)
 * Bodega/AdminBogota → { sedeId }        (solo su sede)
 */
const injectSedeFilter = async (request) => {
  const { rol, sedeId } = request.user ?? {};
  if (rol === "Admin") {
    request.sedeFilter = {};
  } else if (rol === "Bodega" || rol === "AdminBogota") {
    if (!sedeId) throw new AppError("El usuario no tiene sede asignada.", 403);
    request.sedeFilter = { sedeId };
  } else {
    throw new AppError("Rol no autorizado para este recurso.", 403);
  }
};

// ── Grupos de protección (usados en routes) ───────────────────
module.exports = {
  verifyToken,
  requireRole,
  injectSedeFilter,

  // Solo Admin
  soloAdmin: {
    preValidation: [verifyToken, requireRole(["Admin"])],
  },

  // Admin + Bodega + AdminBogota
  adminOBodega: {
    preValidation: [verifyToken, requireRole(["Admin", "Bodega", "AdminBogota"])],
  },

  // Admin + Bodega + AdminBogota — con sedeFilter inyectado
  adminOBodegaConSede: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "Bodega", "AdminBogota"]),
      injectSedeFilter,
    ],
  },

  // Cualquier usuario autenticado
  todos: {
    preValidation: [verifyToken],
  },
};
