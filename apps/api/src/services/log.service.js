const logRepository = require("../repositories/log.repository");
const AppError = require("../errors/AppError");

function esAdmin(usuario) {
  return usuario && usuario.rol === "Admin";
}

const logService = (app) => {
  const repo = logRepository(app.prisma);

  return {
    listar: async (query, usuario) => {
      if (!esAdmin(usuario)) {
        throw new AppError("No tienes permiso para ver el historial de acciones.", 403);
      }

      const filtros = {
        usuarioId: query.usuarioId ? Number(query.usuarioId) : undefined,
        accion: query.accion || undefined,
        fechaInicio: query.fechaInicio || undefined,
        fechaFin: query.fechaFin || undefined,
        skip: Number(query.skip ?? 0),
        take: Number(query.take ?? 50),
      };

      const { total, data } = await repo.listar(filtros);
      return { total, skip: filtros.skip, take: filtros.take, data };
    },

    listarAcciones: async (usuario) => {
      if (!esAdmin(usuario)) {
        throw new AppError("No tienes permiso para ver el historial de acciones.", 403);
      }
      return repo.listarAcciones();
    },
  };
};

module.exports = logService;
