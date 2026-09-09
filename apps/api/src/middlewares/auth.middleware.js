const sesionRepository = require("../repositories/sesion.repository");
const AppError = require("../errors/AppError");

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

    const sede = sesion.usuario.sede ?? null;
    let sedesOperativas = [sesion.usuario.sedeId];
    if (sede) {
      if (sede.tipo === "Bodega") {
        const oficinas = (sede.oficinas ?? []).map((o) => o.id);
        sedesOperativas = oficinas.length > 0 ? oficinas : [0];
      } else if (sede.tipo === "Oficina" && sede.bodegaId) {
        const oficinasDeLaBodega = (sede.bodega?.oficinas ?? []).map((o) => o.id);
        sedesOperativas = [sede.bodegaId, ...oficinasDeLaBodega];
      }
    }

    const esOficina = sede?.tipo === "Oficina" && sede.bodegaId;
    const sedeOperativa =
      sesion.usuario.rol === "Bodega" || sesion.usuario.rol === "Oficinista"
        ? (esOficina ? sede.bodegaId : sesion.usuario.sedeId)
        : sesion.usuario.sedeId;

    request.user = {
      id:             sesion.usuario.id,
      usuario:        sesion.usuario.usuario,
      nombreCompleto: sesion.usuario.nombreCompleto ?? null,
      rol:            sesion.usuario.rol,
      sedeId:         sesion.usuario.sedeId,
      sedeTipo:       sede?.tipo ?? null,
      bodegaId:       sede?.bodegaId ?? null,
      sedeOperativa,
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

const requireRole = (roles) => {
  const permitidos = new Set(roles);
  return async (request) => {
    if (!request.user || !permitidos.has(request.user.rol)) {
      throw new AppError("No tienes permisos suficientes para realizar esta acción.", 403);
    }
  };
};

const injectSedeFilter = async (request) => {
  const { rol, sedeId, bodegaId } = request.user ?? {};
  if (rol === "Admin") {
    request.sedeFilter = {};
  } else if (rol === "AdminBogota" || rol === "Oficinista") {
    if (!sedeId) throw new AppError("El usuario no tiene sede asignada.", 403);
    request.sedeFilter = { sedeId };
  } else if (rol === "Bodega") {
    if (!sedeId) throw new AppError("El usuario no tiene sede asignada.", 403);
    request.sedeFilter = { sedeId: bodegaId ?? sedeId };
  } else {
    throw new AppError("Rol no autorizado para este recurso.", 403);
  }
};

module.exports = {
  verifyToken,
  requireRole,
  injectSedeFilter,

  soloAdmin: {
    preValidation: [verifyToken, requireRole(["Admin"])],
  },

  adminGestion: {
    preValidation: [verifyToken, requireRole(["Admin", "AdminBogota"])],
  },

  adminGestionBodega: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Bodega"]),
    ],
  },

  gestion: {
    preValidation: [verifyToken, requireRole(["Admin", "AdminBogota", "Oficinista"])],
  },

  carteraProveedores: {
    preValidation: [verifyToken, requireRole(["Admin", "AdminBogota", "Oficinista"])],
  },

  gestionConSede: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Oficinista"]),
      injectSedeFilter,
    ],
  },

  consultaBodega: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Bodega", "Oficinista"]),
    ],
  },

  consultaBodegaConSede: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Bodega", "Oficinista"]),
      injectSedeFilter,
    ],
  },

  verEntregas: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Oficinista", "Bodega"]),
    ],
  },

  asignarEntregador: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "AdminBogota", "Bodega", "Oficinista"]),
    ],
  },

  adminOBodega: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "Bodega", "AdminBogota", "Oficinista"]),
    ],
  },

  adminOBodegaConSede: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "Bodega", "AdminBogota", "Oficinista"]),
      injectSedeFilter,
    ],
  },

  carteraClientesAbono: {
    preValidation: [
      verifyToken,
      requireRole(["Admin", "Bodega", "AdminBogota", "Oficinista", "Entregador"]),
    ],
  },

  todos: {
    preValidation: [verifyToken],
  },
};
