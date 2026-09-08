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
    usuario.rol === "Oficinista" ||
    usuario.rol === "Entregador"
  );
}

/** Solo lectura/abono de cartera (no crear/editar/desactivar). */
function puedeConsultarCartera(usuario) {
  return sedeEsPermitida(usuario);
}

function puedeGestionarClientes(usuario) {
  return (
    usuario.rol === "Admin" ||
    usuario.rol === "Bodega" ||
    usuario.rol === "AdminBogota" ||
    usuario.rol === "Oficinista"
  );
}

/**
 * Sedes del entregador: tabla entregador_sedes + sede principal del usuario.
 * Expande cada una a su familia (bodega + oficinas) para ver los mismos clientes.
 */
async function idsSedesEntregador(prisma, usuario) {
  const asignadas = await prisma.entregadorSede.findMany({
    where: { entregadorId: usuario.id },
    select: { sedeId: true },
  });
  const baseIds = new Set(asignadas.map((a) => a.sedeId));
  if (usuario.sedeId != null) baseIds.add(usuario.sedeId);

  if (baseIds.size === 0) return [];

  const todos = new Set();
  for (const id of baseIds) {
    const familia = await resolverFamiliaSede(prisma, id);
    for (const s of familia) todos.add(s.id);
  }
  return [...todos];
}

/**
 * IDs de la familia de sedes del usuario (bodega + oficinas ligadas).
 * Admin no se filtra por familia. Entregador usa sus sedes asignadas.
 */
async function idsFamiliaUsuario(prisma, usuario) {
  if (!usuario || usuario.rol === "Admin") return null;
  if (usuario.rol === "Entregador") {
    return idsSedesEntregador(prisma, usuario);
  }
  if (usuario.sedeId == null) return null;
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
    listar: async ({ nombre, activo, sedeId, soloConDeuda, skip, take }, usuario) => {
      if (!puedeConsultarCartera(usuario)) {
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
        soloConDeuda:
          soloConDeuda === true ||
          soloConDeuda === "true" ||
          usuario.rol === "Entregador",
      };

      if (usuario.rol === "Entregador") {
        const ids = await idsSedesEntregador(app.prisma, usuario);
        if (ids.length === 0) {
          throw new AppError(
            "No tienes sedes asignadas. Pide a un administrador que te asigne a una bodega.",
            403,
          );
        }
        filtros.sedeIds = ids;
        filtros.activo = true;
      } else if (usuario.rol !== "Admin" && usuario.sedeId != null) {
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
      if (!puedeConsultarCartera(usuario)) {
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
      if (!puedeGestionarClientes(usuario)) {
        throw new AppError("No tienes permiso para crear clientes.", 403);
      }
      const { nombre, telefono, limiteCredito, saldoDeuda, sedeId } = data;
      const campos = { nombre, telefono };
      if (limiteCredito !== undefined) campos.limiteCredito = limiteCredito;
      if (saldoDeuda !== undefined) campos.saldoDeuda = saldoDeuda;
      if (sedeId !== undefined) campos.sedeId = sedeId;
      else if (usuario && usuario.rol !== "Admin") campos.sedeId = usuario.sedeId;
      const nuevo = await repo.create(campos);
      if (usuario) {
        await registrarAccion(app, usuario.id, "CREAR_CLIENTE", `Creó el cliente "${nombre}".`);
      }
      return nuevo;
    },

    actualizar: async (id, data, usuario) => {
      if (!puedeGestionarClientes(usuario)) {
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
      for (const c of permitidos) {
        if (data[c] !== undefined) campos[c] = data[c];
      }

      const actualizado = await repo.update(id, campos);
      await registrarAccion(app, usuario.id, "EDITAR_CLIENTE", `Editó el cliente "${existe.nombre}" (#${id}).`);
      return actualizado;
    },

    desactivar: async (id, usuario) => {
      if (!puedeGestionarClientes(usuario)) {
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
      if (!puedeConsultarCartera(usuario)) {
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

      const transaccion = await app.prisma.$transaction(async (tx) => {
        const clienteActualizado = await tx.cliente.update({
          where: { id },
          data: { saldoDeuda: { decrement: valorAbono } },
          include: { sede: { select: { id: true, nombre: true } } },
        });

        let ingreso = null;
        if (sedeAbono != null) {
          const obsEntregador =
            usuario.rol === "Entregador"
              ? `Abono de cliente "${existe.nombre}" (#${id}) cobrado por entregador`
              : `Abono de cliente "${existe.nombre}" (#${id})`;
          ingreso = await ingresoRepo.crear(tx, {
            fecha: inicioDiaLocal(fechaAbono),
            semana: semanaNegocio(fechaAbono),
            sedeId: sedeAbono,
            efectivo: valorAbono,
            cuentas: 0,
            total: valorAbono,
            origen: ORIGENES.ABONO_CLIENTE,
            idReferencia: id,
            observacion: obsEntregador,
          });
        } else {
          throw new AppError(
            `No se puede registrar el abono del cliente "${existe.nombre}" (#${id}): ` +
            `el cliente no tiene una sede asignada para reflejarlo en Contabilidad. Asigna una sede al cliente.`,
            400,
          );
        }

        return { clienteActualizado, ingreso };
      });

      await registrarAccion(
        app,
        usuario.id,
        "ABONAR_CLIENTE",
        `Registró un abono de ${valorAbono} al cliente "${existe.nombre}" (#${id})` +
          (usuario.rol === "Entregador" ? " (entregador)." : "."),
      );
      return transaccion.clienteActualizado;
    },
  };
};

module.exports = clienteService;
