/**
 * Lógica de negocio del módulo Cliente.
 */

const clienteRepository = require("../repositories/cliente.repository");
const AppError = require("../errors/AppError");

function sedeEsPermitida(usuario) {
  return usuario.rol === "Admin" || usuario.rol === "Bodega" || usuario.rol === "AdminBogota";
}

const clienteService = (prisma) => {
  const repo = clienteRepository(prisma);

  return {
    listar: ({ nombre, activo, skip, take }, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para listar clientes.", 403);
      }

      let activoBool;
      if (activo === "true")  activoBool = true;
      if (activo === "false") activoBool = false;

      const filtros = {
        nombre,
        activo: activoBool,
        skip:   Number(skip ?? 0),
        take:   Number(take ?? 50),
      };

      if (usuario.rol !== "Admin" && usuario.sedeId != null) {
        filtros.sedeId = usuario.sedeId;
      }

      return repo.findAll(filtros);
    },

    obtenerPorId: async (id, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para ver clientes.", 403);
      }

      const cliente = await repo.findById(id);
      if (!cliente) throw new AppError(`Cliente ${id} no encontrado`, 404);

      if (usuario.rol !== "Admin" && cliente.sedeId != null && cliente.sedeId !== usuario.sedeId) {
        throw new AppError("No tienes permiso para ver este cliente.", 403);
      }

      return cliente;
    },

    crear: (data) => {
      const { nombre, telefono } = data;
      return repo.create({ nombre, telefono });
    },

    actualizar: async (id, data, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para editar clientes.", 403);
      }

      const existe = await repo.findById(id);
      if (!existe) throw new AppError(`Cliente ${id} no encontrado`, 404);

      if (usuario.rol !== "Admin" && existe.sedeId != null && existe.sedeId !== usuario.sedeId) {
        throw new AppError("No tienes permiso para editar este cliente.", 403);
      }

      const campos = {};
      const permitidos = ["nombre", "telefono", "activo", "limiteCredito"];
      for (const c of permitidos) {
        if (data[c] !== undefined) campos[c] = data[c];
      }

      return repo.update(id, campos);
    },

    desactivar: async (id, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para desactivar clientes.", 403);
      }

      const existe = await repo.findById(id);
      if (!existe) throw new AppError(`Cliente ${id} no encontrado`, 404);

      if (usuario.rol !== "Admin" && existe.sedeId != null && existe.sedeId !== usuario.sedeId) {
        throw new AppError("No tienes permiso para desactivar este cliente.", 403);
      }

      await repo.setActivo(id, false);
      return { mensaje: "Cliente desactivado correctamente" };
    },
  };
};

module.exports = clienteService;
