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
const { sedeEsPermitida, sanitizarTexto } = require("../utils/contabilidad");

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
      const nombreLimpio = sanitizarTexto(nombre, 200);
      if (!nombreLimpio) throw new AppError("El nombre del proveedor es obligatorio.", 422);
      // Nombre único
      const existe = await repo.findByNombre(nombreLimpio);
      if (existe) throw new AppError(`Ya existe un proveedor con el nombre "${nombreLimpio}"`, 409);
      const nuevo = await repo.create({ nombre: nombreLimpio });
      await registrarAccion(app, usuario.id, "CREAR_PROVEEDOR", `Creó el proveedor "${nombreLimpio}".`);
      return nuevo;
    },

    actualizar: async (id, data, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para editar proveedores.", 403);
      }
      const proveedor = await repo.findById(id);
      if (!proveedor) throw new AppError(`Proveedor ${id} no encontrado`, 404);

      const campos = {};
      if (data.nombre !== undefined) {
        const nombreLimpio = sanitizarTexto(data.nombre, 200);
        if (!nombreLimpio) throw new AppError("El nombre del proveedor es obligatorio.", 422);
        // Si cambia el nombre, verificar que no colisione con otro
        if (nombreLimpio !== proveedor.nombre) {
          const colision = await repo.findByNombre(nombreLimpio);
          if (colision) throw new AppError(`Ya existe un proveedor con el nombre "${nombreLimpio}"`, 409);
        }
        campos.nombre = nombreLimpio;
      }
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