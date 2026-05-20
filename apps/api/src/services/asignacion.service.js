/**
 * Lógica de negocio del módulo AsignacionEntrega.
 *
 * Flujo principal:
 *  1. Bodega/Admin crea una asignación -> pedido pasa a "Asignado"
 *  2. Entregador actualiza estado a EnRuta, Entregado o Fallido
 *  3. Al marcar Entregado -> se registra montoCobrado, metodoPago,
 *     fechaConfirmada y se reduce el saldoDeuda del cliente
 */

const asignacionRepo = require("../repositories/asignacion.repository");
const AppError       = require("../errors/AppError");

const asignacionService = (app) => {
  const repo = asignacionRepo(app.prisma);

  return {

    /**
     * Bodega asigna un pedido pendiente a un entregador.
     */
    crear: async ({ pedidoId, entregadorId, observacionesEntrega }, asignadoPorId) => {
      // Validar que el pedido exista y esté Pendiente
      const pedido = await app.prisma.pedido.findUnique({ where: { id: pedidoId } });
      if (!pedido) throw new AppError(`Pedido ${pedidoId} no encontrado`, 404);
      if (pedido.estado !== "Pendiente") {
        throw new AppError(
          `Solo se pueden asignar pedidos en estado Pendiente. Estado actual: ${pedido.estado}`,
          400,
        );
      }

      // Validar que el entregador exista y tenga el rol correcto
      const entregador = await app.prisma.usuario.findUnique({ where: { id: entregadorId } });
      if (!entregador) throw new AppError(`Entregador ${entregadorId} no encontrado`, 404);
      if (entregador.rol !== "Entregador") {
        throw new AppError("El usuario asignado no tiene el rol de Entregador", 400);
      }
      if (!entregador.activo) {
        throw new AppError("El entregador está inactivo", 400);
      }

      // Transacción: crear asignación + cambiar estado del pedido
      const asignacion = await app.prisma.$transaction(async (tx) => {
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
          data:  { estado: "Asignado" },
        });

        return nueva;
      });

      return repo.findById(asignacion.id);
    },

    /**
     * Listar asignaciones con filtros.
     */
    listar: ({ entregadorId, estado, pedidoId, skip, take } = {}) =>
      repo.listar({
        entregadorId: entregadorId ? Number(entregadorId) : undefined,
        pedidoId:     pedidoId     ? Number(pedidoId)     : undefined,
        estado,
        skip: Number(skip ?? 0),
        take: Number(take ?? 50),
      }),

    /**
     * Vista del entregador: solo sus propias asignaciones activas.
     */
    misEntregas: (entregadorId, { estado, skip, take } = {}) =>
      repo.listar({
        entregadorId,
        estado,
        skip: Number(skip ?? 0),
        take: Number(take ?? 50),
      }),

    /**
     * Obtener una asignación por ID.
     */
    obtenerPorId: async (id) => {
      const asignacion = await repo.findById(id);
      if (!asignacion) throw new AppError(`Asignación ${id} no encontrada`, 404);
      return asignacion;
    },

    /**
     * El entregador actualiza el estado de su asignación.
     * Al confirmar entrega registra cobro y cierra la deuda del cliente.
     */
    actualizarEstado: async (id, body, usuarioId, rolUsuario) => {
      const asignacion = await repo.findById(id);
      if (!asignacion) throw new AppError(`Asignación ${id} no encontrada`, 404);

      // Un entregador solo puede actualizar sus propias asignaciones
      if (rolUsuario === "Entregador" && asignacion.entregadorId !== usuarioId) {
        throw new AppError("No tienes permiso para actualizar esta asignación", 403);
      }

      // Transiciones válidas
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

      // Validar campos requeridos para confirmar entrega
      if (nuevoEstado === "Entregado") {
        if (montoCobrado === undefined || montoCobrado === null) {
          throw new AppError("Se requiere montoCobrado al confirmar la entrega", 400);
        }
        if (!metodoPago) {
          throw new AppError("Se requiere metodoPago al confirmar la entrega", 400);
        }

        // Transacción: actualizar asignación + pedido + deuda del cliente
        await app.prisma.$transaction(async (tx) => {
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

          // Reducir la deuda del cliente según lo efectivamente cobrado
          await tx.cliente.update({
            where: { id: asignacion.pedido.cliente.id },
            data:  { saldoDeuda: { decrement: Number(montoCobrado) } },
          });
        });

        return repo.findById(id);
      }

      // Para EnRuta o Fallido: solo actualizar estado
      const dataUpdate = { estado: nuevoEstado };
      if (observacionesEntrega) dataUpdate.observacionesEntrega = observacionesEntrega;

      // Si falla la entrega, el pedido vuelve a Pendiente para poder reasignarse
      if (nuevoEstado === "Fallido") {
        await app.prisma.$transaction(async (tx) => {
          await tx.asignacionEntrega.update({ where: { id }, data: dataUpdate });
          await tx.pedido.update({ where: { id: asignacion.pedidoId }, data: { estado: "Pendiente" } });
        });
        return repo.findById(id);
      }

      return repo.update(id, dataUpdate);
    },
  };
};

module.exports = asignacionService;
