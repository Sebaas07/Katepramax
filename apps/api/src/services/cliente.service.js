/**
 * Lógica de negocio del módulo Cliente.
 */

const clienteRepository = require("../repositories/cliente.repository");
const AppError = require("../errors/AppError");

const clienteService = (app) => {
  const repo = clienteRepository(app.prisma);

  return {

    listar: ({ nombre, activo, skip, take }) => {
      // Convertir el string "true"/"false" que llega del querystring a booleano
      let activoBool;
      if (activo === "true")  activoBool = true;
      if (activo === "false") activoBool = false;

      return repo.findAll({
        nombre,
        activo: activoBool,
        skip:   Number(skip ?? 0),
        take:   Number(take ?? 50),
      });
    },

    obtenerPorId: async (id) => {
      const cliente = await repo.findById(id);
      if (!cliente) throw new AppError(`Cliente ${id} no encontrado`, 404);
      return cliente;
    },

    crear: (data) => {
      const { nombre, telefono } = data;
      return repo.create({ nombre, telefono });
    },

    actualizar: async (id, data) => {
      const existe = await repo.findById(id);
      if (!existe) throw new AppError(`Cliente ${id} no encontrado`, 404);

      const campos = {};
      const permitidos = ["nombre", "telefono", "activo", "limiteCredito"];
      for (const c of permitidos) {
        if (data[c] !== undefined) campos[c] = data[c];
      }

      return repo.update(id, campos);
    },

    desactivar: async (id) => {
      const existe = await repo.findById(id);
      if (!existe) throw new AppError(`Cliente ${id} no encontrado`, 404);
      await repo.setActivo(id, false);
      return { mensaje: "Cliente desactivado correctamente" };
    },
  };
};

module.exports = clienteService;
