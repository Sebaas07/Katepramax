/**
 * Lógica de negocio del módulo Cliente.
 */

const clienteRepository = require("../repositories/cliente.repository");
const AppError = require("../errors/AppError");

function sedeEsPermitida(usuario) {
  return (
    usuario.rol === "Admin" ||
    usuario.rol === "Bodega" ||
    usuario.rol === "AdminBogota"
  );
}

const clienteService = (prisma) => {
  const repo = clienteRepository(prisma);

  return {
    listar: ({ nombre, activo, skip, take }, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para listar clientes.", 403);
      }

      let activoBool;
      if (activo === "true") activoBool = true;
      if (activo === "false") activoBool = false;

      const filtros = {
        nombre,
        activo: activoBool,
        skip: Number(skip ?? 0),
        take: Number(take ?? 50),
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

      if (
        usuario.rol !== "Admin" &&
        cliente.sedeId != null &&
        cliente.sedeId !== usuario.sedeId
      ) {
        throw new AppError("No tienes permiso para ver este cliente.", 403);
      }

      return cliente;
    },

    crear: async (data, usuario) => {
      const { nombre, telefono, limiteCredito, saldoDeuda } = data;
      const campos = { nombre, telefono };
      if (limiteCredito !== undefined) campos.limiteCredito = limiteCredito;
      if (saldoDeuda !== undefined) campos.saldoDeuda = saldoDeuda;
      const nuevo = await repo.create(campos);
      if (usuario) {
        await registrarAccion(app, usuario.id, "CREAR_CLIENTE", `Creó el cliente "${nombre}".`);
      }
      return nuevo;
    },

    actualizar: async (id, data, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para editar clientes.", 403);
      }

      const existe = await repo.findById(id);
      if (!existe) throw new AppError(`Cliente ${id} no encontrado`, 404);

      if (
        usuario.rol !== "Admin" &&
        existe.sedeId != null &&
        existe.sedeId !== usuario.sedeId
      ) {
        throw new AppError("No tienes permiso para editar este cliente.", 403);
      }

      const campos = {};
      const permitidos = [
        "nombre",
        "telefono",
        "activo",
        "limiteCredito",
        "saldoDeuda",
      ];
      for (const c of permitidos) {
        if (data[c] !== undefined) campos[c] = data[c];
      }

      const actualizado = await repo.update(id, campos);
      await registrarAccion(app, usuario.id, "EDITAR_CLIENTE", `Editó el cliente "${existe.nombre}" (#${id}).`);
      return actualizado;
    },

    desactivar: async (id, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para desactivar clientes.", 403);
      }

      const existe = await repo.findById(id);
      if (!existe) throw new AppError(`Cliente ${id} no encontrado`, 404);

      if (
        usuario.rol !== "Admin" &&
        existe.sedeId != null &&
        existe.sedeId !== usuario.sedeId
      ) {
        throw new AppError(
          "No tienes permiso para desactivar este cliente.",
          403,
        );
      }

      await repo.setActivo(id, false);
      await registrarAccion(app, usuario.id, "DESACTIVAR_CLIENTE", `Desactivó el cliente "${existe.nombre}" (#${id}).`);
      return { mensaje: "Cliente desactivado correctamente" };
    },

    abonar: async (id, monto, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para abonar a clientes.", 403);
      }

      const existe = await repo.findById(id);
      if (!existe) throw new AppError(`Cliente ${id} no encontrado`, 404);

      if (
        usuario.rol !== "Admin" &&
        existe.sedeId != null &&
        existe.sedeId !== usuario.sedeId
      ) {
        throw new AppError(
          "No tienes permiso para abonar a este cliente.",
          403,
        );
      }

      const valorAbono = Number(monto);
      if (isNaN(valorAbono) || valorAbono <= 0) {
        throw new AppError("El monto del abono debe ser mayor a 0.", 400);
      }

      if (Number(existe.saldoDeuda) < valorAbono) {
        throw new AppError(
          "El abono no puede ser mayor al saldo deuda actual.",
          400,
        );
      }

      const clienteActualizado = await repo.abonar(id, valorAbono);
      await registrarAccion(app, usuario.id, "ABONAR_CLIENTE", `Registró un abono de ${valorAbono} al cliente "${existe.nombre}" (#${id}).`);
      return clienteActualizado;
    },
  };
};

module.exports = clienteService;
