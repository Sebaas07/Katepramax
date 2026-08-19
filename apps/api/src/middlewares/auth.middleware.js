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
  
  try {
    const sesRepo = sesionRepository(request.server.prisma);
    const sesion  = await sesRepo.findById(sesionId);

    if (!sesion)                          throw new AppError("Sesión inexistente o revocada.", 401);
    if (!sesion.usuario?.activo)          throw new AppError("El usuario ya no tiene acceso al sistema.", 401);

    await sesRepo.actualizarExpiracion(sesion.id);

    if (request.cookies?.refreshToken) {
      reply.setCookie("refreshToken", request.cookies.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
        maxAge: 15 * 60,
        path: "/api/v1",
      });
    }

    // Sobreescribir con datos REALES de la BD — nunca confiar en el payload del JWT
    const sede = sesion.usuario.sede ?? null;
    let sedesOperativas = [sesion.usuario.sedeId];
    if (sede) {
      if (sede.tipo === "Bodega") {
        sedesOperativas = [sede.id, ...(sede.oficinas ?? []).map((o) => o.id)];
      } else if (sede.tipo === "Oficina" && sede.bodegaId) {
        sedesOperativas = [sede.id, sede.bodegaId];
      }
    }

    request.user = {
      id:             sesion.usuario.id,
      usuario:        sesion.usuario.usuario,
      rol:            sesion.usuario.rol,
      sedeId:         sesion.usuario.sedeId,
      sedeTipo:       sede?.tipo ?? null,
      bodegaId:       sede?.bodegaId ?? null,
      sedesOperativas,
      sesionId:       sesion.id,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Error al verificar la sesión. Intenta iniciar sesión de nuevo.", 401);
  }
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
  } else if (rol === "AdminBogota" || rol === "Bodega" || rol === "Oficinista") {
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

  // Admin + AdminBogota (escriben en módulos de gestión)
  adminGestion: {
    preValidation: [verifyToken, requireRole(["Admin", "AdminBogota"])],
  },

  // Gestión de pedidos y asignaciones — Admin + AdminBogota + Oficinista
  gestion: {
    preValidation: [verifyToken, requireRole(["Admin", "AdminBogota", "Oficinista"])],
  },

  // Gestión de pedidos/asignaciones — con filtro de sede por rol
  gestionConSede: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Oficinista"]),
      injectSedeFilter,
    ],
  },

  // Consulta de información para Bodega/Oficinista (solo lectura) — + Admin/AdminBogota
  consultaBodega: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Bodega", "Oficinista"]),
    ],
  },

  // Consulta con filtro de sede — Admin + AdminBogota + Bodega + Oficinista
  consultaBodegaConSede: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Bodega", "Oficinista"]),
      injectSedeFilter,
    ],
  },

  // Ver entregas (asignaciones) — Admin + AdminBogota + Oficinista + Bodega
  verEntregas: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Oficinista", "Bodega"]),
    ],
  },

  // Asignar entregador a pedidos — Admin + AdminBogota + Bodega (NO Oficinista)
  asignarEntregador: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Bodega"]),
    ],
  },

  // Admin + Bodega + AdminBogota + Oficinista
  adminOBodega: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "Bodega", "AdminBogota", "Oficinista"]),
    ],
  },

  // Admin + Bodega + AdminBogota + Oficinista — con sedeFilter inyectado
  adminOBodegaConSede: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "Bodega", "AdminBogota", "Oficinista"]),
      injectSedeFilter,
    ],
  },

  // Cualquier usuario autenticado
  todos: {
    preValidation: [verifyToken],
  },
};
