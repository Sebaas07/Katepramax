/**
 * Lógica de negocio del módulo AsignacionEntrega.
 *
 * Flujo principal:
 *  1. Bodega/Admin crea una asignación -> pedido pasa a "Asignado"
 *  2. Entregador actualiza estado a EnRuta, Entregado o Fallido
 *  3. Al marcar Entregado -> se registra montoCobrado, metodoPago,
 *     fechaConfirmada y se reduce el saldoDeuda del cliente
 *
 * Reglas de sede por rol:
 * - Admin: acceso total.
 * - Bodega / AdminBogota: solo su sede.
 * - Entregador: solo sus propias asignaciones.
 */

const asignacionRepo = require("../repositories/asignacion.repository");
const repoPedido      = require("../repositories/pedido.repository");
const AppError        = require("../errors/AppError");

function sedeEsPermitida(usuario) {
  if (!usuario) return false;
  return usuario.rol === "Admin" || usuario.rol === "Bodega" || usuario.rol === "AdminBogota";
}

const asignacionService = (app) => ({
  repo: asignacionRepo(app.prisma),
  prisma: app.prisma,

  /**
   * Bodega/Admin asigna un pedido pendiente a un entregador.
   * Valida que el pedido pertenezca a su sede.
   */
  async crear({ pedidoId, entregadorId, observacionesEntrega }, asignadoPorId, usuario) {
    if (!sedeEsPermitida(usuario)) {
      throw new AppError("No tienes permiso para crear asignaciones.", 403);
    }

    const pedido = await repoPedido.buscarPorId(this.prisma, pedidoId);
    if (!pedido) throw new AppError(`Pedido ${pedidoId} no encontrado`, 404);

    if (pedido.estado !== "Pendiente") {
      throw new AppError(`Pedido ${pedidoId} no está Pendiente`, 400);
    }

    if (usuario.rol !== "Admin") {
      const sedePedido = pedido.sedeId ?? pedido.creador?.sedeId;
      if (sedePedido == null || sedePedido !== usuario.sedeId) {
        throw new AppError("No tienes permiso para asignar pedidos de otra sede.", 403);
      }
    }

    const entregador = await this.prisma.usuario.findUnique({ where: { id: entregadorId } });
    if (!entregador) throw new AppError(`Entregador ${entregadorId} no encontrado`, 404);
    if (entregador.rol !== "Entregador") {
      throw new AppError("El usuario asignado no tiene el rol de Entregador", 400);
    }
    if (!entregador.activo) {
      throw new AppError("El entregador está inactivo", 400);
    }

    const asignacionExistente = await this.repo.obtenerAsignacionPorPedido(pedidoId);

    const resultado = await this.prisma.$transaction(async (tx) => {
      if (asignacionExistente) {
        await tx.asignacionEntrega.update({
          where: { id: asignacionExistente.id },
          data: {
            entregadorId,
            asignadoPorId,
            observacionesEntrega: observacionesEntrega ?? asignacionExistente.observacionesEntrega,
            estado: "Pendiente",
          },
        });
        await tx.pedido.update({
          where: { id: pedidoId },
          data: { estado: "Pendiente" },
        });
        return { ...asignacionExistente, entregadorId };
      } else {
        const nueva = await tx.asignacionEntrega.create({
          data: {
            pedidoId,
            entregadorId,
            asignadoPorId,
            observacionesEntrega,
          },
        });

        await tx.pedido.update({
          where: { id: pedidoId },
          data: { estado: "Asignado" },
        });

        return nueva;
      }
    });

    return this.repo.findById(asignacionExistente ? asignacionExistente.id : resultado.id);
  },

  /**
   * Listar asignaciones con filtros y restricción de sede.
   */
  async listar({ entregadorId, estado, pedidoId, skip, take } = {}, usuario) {
    if (!sedeEsPermitida(usuario)) {
      throw new AppError("No tienes permiso para listar asignaciones.", 403);
    }

    const where = {};

    if (entregadorId) where.entregadorId = Number(entregadorId);
    if (estado)       where.estado       = estado;
    if (pedidoId)     where.pedidoId     = Number(pedidoId);

    if (usuario.rol !== "Admin" && usuario.sedeId != null) {
      where.OR = [
        { pedido: { sedeId: usuario.sedeId } },
        { pedido: { creador: { sedeId: usuario.sedeId } } },
      ];
    }

    return this.prisma.asignacionEntrega.findMany({
      where,
      include: {
        pedido: {
          select: {
            id: true,
            estado: true,
            observaciones: true,
            sedeId: true,
            creador: { select: { sedeId: true } },
            cliente: { select: { id: true, nombre: true, telefono: true } },
          },
        },
        entregador: { select: { id: true, nombreCompleto: true, telefono: true } },
        asignador:  { select: { id: true, nombreCompleto: true } },
      },
      orderBy: { asignadoEn: "desc" },
      skip: Number(skip ?? 0),
      take: Number(take ?? 50),
    });
  },

/**
    * Vista del entregador: solo sus propias asignaciones.
    */
   misEntregas: (entregadorId, { estado, skip, take } = {}) =>
    asignacionRepo(app.prisma).listar({
      entregadorId,
      estado,
      skip: Number(skip ?? 0),
      take: Number(take ?? 50),
    }),

  /**
   * Obtener una asignación por ID con control de acceso.
   */
  async obtenerPorId(id, usuario) {
    if (!sedeEsPermitida(usuario) && usuario?.rol !== "Entregador") {
      throw new AppError("No tienes permiso para ver esta asignación.", 403);
    }

    const asignacion = await this.repo.findById(id);
    if (!asignacion) throw new AppError(`Asignación ${id} no encontrada`, 404);

    if (usuario.rol === "Entregador" && asignacion.entregadorId !== usuario.id) {
      throw new AppError("No tienes permiso para ver esta asignación.", 403);
    }

    if (usuario.rol !== "Admin" && usuario.rol !== "Entregador" && usuario.sedeId != null) {
      const sedePedido = asignacion.pedido?.sedeId ?? asignacion.pedido?.creador?.sedeId;
      if (sedePedido == null || sedePedido !== usuario.sedeId) {
        throw new AppError("No tienes permiso para ver esta asignación.", 403);
      }
    }

    return asignacion;
  },

  /**
   * El entregador actualiza el estado de su asignación.
   */
  async actualizarEstado(id, body, usuarioId, rolUsuario, sedeIdUsuario) {
    if (!["Admin", "Bodega", "AdminBogota", "Entregador"].includes(rolUsuario)) {
      throw new AppError("No tienes permiso para actualizar asignaciones.", 403);
    }

    const asignacion = await this.repo.findById(id);
    if (!asignacion) throw new AppError(`Asignaci\u00F3n ${id} no encontrada`, 404);

    if (rolUsuario === "Entregador" && asignacion.entregadorId !== usuarioId) {
      throw new AppError("No tienes permiso para actualizar esta asignaci\u00F3n", 403);
    }

    if (rolUsuario !== "Admin" && rolUsuario !== "Entregador" && sedeIdUsuario != null) {
      const sedePedido = asignacion.pedido?.sedeId ?? asignacion.pedido?.creador?.sedeId;
      if (sedePedido == null || sedePedido !== sedeIdUsuario) {
        throw new AppError("No tienes permiso para actualizar esta asignaci\u00F3n.", 403);
      }
    }

    const transiciones = {
      Pendiente:  ["EnRuta", "Fallido"],
      EnRuta:     ["Entregado", "Fallido"],
      Entregado:  [],
      Fallido:    [],
    };

    const { nuevoEstado, montoCobrado, metodoPago, observacionesEntrega } = body;

    if (!transiciones[asignacion.estado]?.includes(nuevoEstado)) {
      throw new AppError(
        `No se puede pasar de ${asignacion.estado} a ${nuevoEstado}`,
        400,
      );
    }

    if (nuevoEstado === "Entregado") {
      if (montoCobrado === undefined || montoCobrado === null) {
        throw new AppError("Se requiere montoCobrado al confirmar la entrega", 400);
      }
      if (!metodoPago) {
        throw new AppError("Se requiere metodoPago al confirmar la entrega", 400);
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.asignacionEntrega.update({
          where: { id },
          data: {
            estado:              "Entregado",
            montoCobrado,
            metodoPago,
            fechaConfirmada:     new Date(),
            observacionesEntrega: observacionesEntrega ?? asignacion.observacionesEntrega,
          },
        });

        await tx.pedido.update({
          where: { id: asignacion.pedidoId },
          data:  { estado: "Entregado", totalRecibido: montoCobrado },
        });

        const clienteId = asignacion.pedido?.cliente?.id ?? asignacion.pedido?.clienteId;
        if (!clienteId) {
          throw new AppError("No se pudo determinar el cliente del pedido.", 400);
        }
        await tx.cliente.update({
          where: { id: clienteId },
          data:  { saldoDeuda: { decrement: Number(montoCobrado) } },
        });
      });

      return this.repo.findById(id);
    }

    const dataUpdate = { estado: nuevoEstado };
    if (observacionesEntrega) dataUpdate.observacionesEntrega = observacionesEntrega;

    if (nuevoEstado === "Fallido") {
      await this.prisma.$transaction(async (tx) => {
        await tx.asignacionEntrega.update({ where: { id }, data: dataUpdate });
        await tx.pedido.update({ where: { id: asignacion.pedidoId }, data: { estado: "Pendiente" } });
      });
      return this.repo.findById(id);
    }

    return this.repo.update(id, dataUpdate);
  },
});

module.exports = (app) => asignacionService(app);