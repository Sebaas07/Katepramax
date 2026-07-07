/**
 * Lógica de negocio del módulo Proveedor.
 * Reglas de sede por rol:
 * - Admin: acceso total.
 * - Bodega / AdminBogota: acceso permitido (proveedores no tienen sede).
 * NOTA: Los proveedores son globales y no están asociados a una sede específica.
 */
const proveedorRepository = require("../repositories/proveedor.repository");
const AppError             = require("../errors/AppError");
const { registrarAccion }  = require("../utils/logger");

function sedeEsPermitida(usuario) {
  return usuario.rol === "Admin" || usuario.rol === "Bodega" || usuario.rol === "AdminBogota";
}

const proveedorService = (app) => {
  const repo = proveedorRepository(app.prisma);

  return {
    listar: ({ nombre, activo, skip, take }, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para listar proveedores.", 403);
      }
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

    obtenerPorId: async (id, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para ver proveedores.", 403);
      }
      const proveedor = await repo.findById(id);
      if (!proveedor) throw new AppError(`Proveedor ${id} no encontrado`, 404);
      return proveedor;
    },

    crear: async ({ nombre }, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para crear proveedores.", 403);
      }
      // Nombre único
      const existe = await repo.findByNombre(nombre);
      if (existe) throw new AppError(`Ya existe un proveedor con el nombre "${nombre}"`, 409);
      const nuevo = await repo.create({ nombre });
      await registrarAccion(app, usuario.id, "CREAR_PROVEEDOR", `Creó el proveedor "${nombre}".`);
      return nuevo;
    },

    actualizar: async (id, data, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para editar proveedores.", 403);
      }
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

      const actualizado = await repo.update(id, campos);
      await registrarAccion(app, usuario.id, "EDITAR_PROVEEDOR", `Editó el proveedor "${proveedor.nombre}" (#${id}).`);
      return actualizado;
    },

    desactivar: async (id, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para desactivar proveedores.", 403);
      }
      const proveedor = await repo.findById(id);
      if (!proveedor) throw new AppError(`Proveedor ${id} no encontrado`, 404);
      await repo.update(id, { activo: false });
      await registrarAccion(app, usuario.id, "DESACTIVAR_PROVEEDOR", `Desactivó el proveedor "${proveedor.nombre}" (#${id}).`);
      return { mensaje: "Proveedor desactivado correctamente" };
    },
  };
};

module.exports = proveedorService;