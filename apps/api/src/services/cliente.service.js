/**
 * Lógica de negocio del módulo Cliente.
 */

const clienteRepository = require("../repositories/cliente.repository");
const ingresoRepo = require("../repositories/ingreso.repository");
const AppError = require("../errors/AppError");
const { registrarAccion } = require("../utils/logger");
const { semanaNegocio, inicioDiaLocal, ORIGENES, resolverFamiliaSede } = require("../utils/contabilidad");

function sedeEsPermitida(usuario) {
  return (
    usuario.rol === "Admin" ||
    usuario.rol === "Bodega" ||
    usuario.rol === "AdminBogota" ||
    usuario.rol === "Oficinista"
  );
}

/**
 * IDs de la familia de sedes del usuario (bodega + oficinas ligadas).
 * Admin no se filtra por familia.
 */
async function idsFamiliaUsuario(prisma, usuario) {
  if (!usuario || usuario.rol === "Admin" || usuario.sedeId == null) return null;
  const familia = await resolverFamiliaSede(prisma, usuario.sedeId);
  const ids = familia.map((s) => s.id);
  return ids.length > 0 ? ids : [usuario.sedeId];
}

/**
 * true si el cliente es accesible para el usuario (misma familia de sedes).
 * Clientes sin sede solo los ve Admin.
 */
function clienteAccesible(cliente, familiaIds, usuario) {
  if (usuario.rol === "Admin") return true;
  if (cliente.sedeId == null) return false;
  if (!familiaIds || familiaIds.length === 0) return cliente.sedeId === usuario.sedeId;
  return familiaIds.includes(cliente.sedeId);
}

const clienteService = (app) => {
  const repo = clienteRepository(app.prisma);

  return {
    listar: async ({ nombre, activo, sedeId, skip, take }, usuario) => {
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
        // Compartir clientes entre la bodega y sus oficinas (misma familia).
        const ids = await idsFamiliaUsuario(app.prisma, usuario);
        if (ids && ids.length > 1) filtros.sedeIds = ids;
        else if (ids && ids.length === 1) filtros.sedeId = ids[0];
        else filtros.sedeId = usuario.sedeId;
      } else if (usuario.rol === "Admin" && sedeId) {
        const ids = (await resolverFamiliaSede(app.prisma, sedeId)).map((s) => s.id);
        if (ids.length === 1)      filtros.sedeId = ids[0];
        else if (ids.length > 1)   filtros.sedeIds = ids;
        else                       filtros.sedeId = Number(sedeId);
      }

      return repo.findAll(filtros);
    },

    obtenerPorId: async (id, usuario) => {
      if (!sedeEsPermitida(usuario)) {
        throw new AppError("No tienes permiso para ver clientes.", 403);
      }

      const cliente = await repo.findById(id);
      if (!cliente) throw new AppError(`Cliente ${id} no encontrado`, 404);

      const familiaIds = await idsFamiliaUsuario(app.prisma, usuario);
      if (!clienteAccesible(cliente, familiaIds, usuario)) {
        throw new AppError("No tienes permiso para ver este cliente.", 403);
      }

      return cliente;
    },

    crear: async (data, usuario) => {
      const { nombre, telefono, limiteCredito, saldoDeuda, sedeId } = data;
      const campos = { nombre, telefono };
      if (limiteCredito !== undefined) campos.limiteCredito = limiteCredito;
      if (saldoDeuda !== undefined) campos.saldoDeuda = saldoDeuda;
      // Si no es Admin, el cliente queda asociado a la sede del usuario que lo crea.
      // Admin puede omitir sedeId o enviarlo explícitamente.
      if (sedeId !== undefined) campos.sedeId = sedeId;
      else if (usuario && usuario.rol !== "Admin") campos.sedeId = usuario.sedeId;
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

      const familiaIds = await idsFamiliaUsuario(app.prisma, usuario);
      if (!clienteAccesible(existe, familiaIds, usuario)) {
        throw new AppError("No tienes permiso para editar este cliente.", 403);
      }

      const campos = {};
      const permitidos = [
        "nombre",
        "telefono",
        "activo",
        "limiteCredito",
        "sedeId",
      ];
      // saldoDeuda no se edita a mano: solo cambia vía operaciones
      // (pedido creado/cancelado, entrega, abonos) para mantener la
      // cartera coherente con los movimientos contables.
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

      const familiaIds = await idsFamiliaUsuario(app.prisma, usuario);
      if (!clienteAccesible(existe, familiaIds, usuario)) {
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

      const familiaIds = await idsFamiliaUsuario(app.prisma, usuario);
      if (!clienteAccesible(existe, familiaIds, usuario)) {
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

      const sedeAbono = existe.sedeId ?? usuario?.sedeId;
      const fechaAbono = new Date();

      // El abono es dinero que llega a la caja: se modifica la deuda del
      // cliente y se registra el Ingreso correspondiente en la misma
      // transacción, para que Contabilidad siempre lo replique.
      const transaccion = await app.prisma.$transaction(async (tx) => {
        const clienteActualizado = await tx.cliente.update({
          where: { id },
          data: { saldoDeuda: { decrement: valorAbono } },
          include: { sede: { select: { id: true, nombre: true } } },
        });

        let ingreso = null;
        if (sedeAbono != null) {
          ingreso = await ingresoRepo.crear(tx, {
            fecha: inicioDiaLocal(fechaAbono),
            semana: semanaNegocio(fechaAbono),
            sedeId: sedeAbono,
            efectivo: valorAbono,
            cuentas: 0,
            total: valorAbono,
            origen: ORIGENES.ABONO_CLIENTE,
            idReferencia: id,
            observacion: `Abono de cliente "${existe.nombre}" (#${id})`,
          });
        } else {
          // Todo abono es dinero que entra a la caja y debe quedar en
          // Contabilidad: sin sede no hay dónde registrarlo, así que se
          // rechaza en lugar de aceptar y dejar el movimiento fuera.
          throw new AppError(
            `No se puede registrar el abono del cliente "${existe.nombre}" (#${id}): ` +
            `el cliente no tiene una sede asignada para reflejarlo en Contabilidad. Asigna una sede al cliente.`,
            400,
          );
        }

        return { clienteActualizado, ingreso };
      });

      await registrarAccion(app, usuario.id, "ABONAR_CLIENTE", `Registró un abono de ${valorAbono} al cliente "${existe.nombre}" (#${id}).`);
      return transaccion.clienteActualizado;
    },
  };
};

module.exports = clienteService;
