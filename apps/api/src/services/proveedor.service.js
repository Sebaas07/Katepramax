/**
 * Lógica de negocio del módulo Proveedor.
 */

const proveedorRepository = require("../repositories/proveedor.repository");
const AppError             = require("../errors/AppError");

const proveedorService = (app) => {
  const repo = proveedorRepository(app.prisma);

  return {

    listar: ({ nombre, activo, skip, take }) => {
      let activoBool;
      if (activo === "true")  activoBool = true;
      if (activo === "false") activoBool = false;

      return repo.findAll({
        nombre,
        activo: activoBool,
        skip: Number(skip ?? 0),
        take: Number(take ?? 50),
      });
    },

    obtenerPorId: async (id) => {
      const proveedor = await repo.findById(id);
      if (!proveedor) throw new AppError(`Proveedor ${id} no encontrado`, 404);
      return proveedor;
    },

    crear: async ({ nombre }) => {
      // Nombre único
      const existe = await repo.findByNombre(nombre);
      if (existe) throw new AppError(`Ya existe un proveedor con el nombre "${nombre}"`, 409);
      return repo.create({ nombre });
    },

    actualizar: async (id, data) => {
      const proveedor = await repo.findById(id);
      if (!proveedor) throw new AppError(`Proveedor ${id} no encontrado`, 404);

      // Si cambia el nombre, verificar que no colisione con otro
      if (data.nombre && data.nombre !== proveedor.nombre) {
        const colision = await repo.findByNombre(data.nombre);
        if (colision) throw new AppError(`Ya existe un proveedor con el nombre "${data.nombre}"`, 409);
      }

      const campos = {};
      if (data.nombre !== undefined) campos.nombre = data.nombre;
      if (data.activo !== undefined) campos.activo = data.activo;

      return repo.update(id, campos);
    },

    desactivar: async (id) => {
      const proveedor = await repo.findById(id);
      if (!proveedor) throw new AppError(`Proveedor ${id} no encontrado`, 404);
      await repo.update(id, { activo: false });
      return { mensaje: "Proveedor desactivado correctamente" };
    },
  };
};

module.exports = proveedorService;
