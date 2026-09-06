/**
 * Lógica de negocio del módulo AsignacionEntrega.
 *
 * Flujo principal:
 *  1. Bodega/Admin crea una asignación -> pedido pasa a "Asignado"
 *  2. Entregador actualiza estado a EnRuta, Entregado o Fallido
 *  3. Al marcar Entregado -> se registra montoCobrado, metodoPago,
 *     fechaConfirmada y se reduce el saldoDeuda del cliente. Si además
 *     el cliente tenía deuda de pedidos anteriores, el entregador puede
 *     recibir un abonoDeuda adicional que también reduce el saldoDeuda
 *     en la misma transacción.
 *
 *     metodoPago admite: Efectivo, Transferencia, Mixto (requiere
 *     montoEfectivo + montoTransferencia sumando montoCobrado), Parcial
 *     (se cobra menos del total del pedido, el resto queda en saldoDeuda)
 *     y Credito (no se cobra nada ahora, montoCobrado = 0).
 *
 * Reglas de sede por rol:
 * - Admin: acceso total.
 * - AdminBogota / Bodega / Oficinista: solo su sede.
 * - Entregador: solo sus propias asignaciones.
 */

const asignacionRepo = require("../repositories/asignacion.repository");
const repoPedido      = require("../repositories/pedido.repository");
const ingresoRepo     = require("../repositories/ingreso.repository");
const AppError        = require("../errors/AppError");
const { registrarAccion } = require("../utils/logger");
const { semanaNegocio, inicioDiaLocal, ORIGENES } = require("../utils/contabilidad");

// Roles que pueden CREAR /asignar pedidos a entregadores
function esGestion(usuario) {
  if (!usuario) return false;
  return ["Admin", "AdminBogota", "Oficinista", "Bodega"].includes(usuario.rol);
}

// Roles que pueden VER entregas (incluye Bodega en modo lectura)
function sedeEsPermitida(usuario) {
  if (!usuario) return false;
  return ["Admin", "AdminBogota", "Oficinista", "Bodega"].includes(usuario.rol);
}

/**
 * Sedes "operativas" de un usuario para asignaciones:
 * - Admin: null (ve todo).
 * - Bodega: su propia sede + las oficinas que le pertenecen (bodegaId),
 *   para poder asignar entregador a los pedidos que crean sus oficinas.
 * - Oficinista (Oficina): su sede y, si tiene bodega asignada, la bodega.
 * - AdminBogota: su sede.
 * El set se resuelve en el auth middleware (`usuario.sedesOperativas`).
 */
function sedesOperativas(usuario) {
  if (usuario?.rol === "Admin") return null;
  if (Array.isArray(usuario?.sedesOperativas) && usuario.sedesOperativas.length > 0) {
    return usuario.sedesOperativas;
  }
  return [usuario?.sedeId];
}

const asignacionService = (app) => ({
  repo: asignacionRepo(app.prisma),
  prisma: app.prisma,

  /**
   * Admin/AdminBogota/Oficinista asigna un pedido pendiente a un entregador.
   * Valida que el pedido pertenezca a su sede.
   */
  async crear({ pedidoId, entregadorId, observacionesEntrega }, asignadoPorId, usuario) {
    if (!esGestion(usuario)) {
      throw new AppError("No tienes permiso para crear asignaciones.", 403);
    }

    const pedido = await repoPedido.buscarPorId(this.prisma, pedidoId);
    if (!pedido) throw new AppError(`Pedido ${pedidoId} no encontrado`, 404);

    if (pedido.estado !== "Pendiente") {
      throw new AppError(`Pedido ${pedidoId} no está Pendiente`, 400);
    }

    if (usuario.rol !== "Admin") {
      const sedes = sedesOperativas(usuario);
      const sedePedido = pedido.sedeId ?? pedido.creador?.sedeId;
      if (sedePedido == null || !sedes.includes(sedePedido)) {
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

    const final = await this.repo.findById(asignacionExistente ? asignacionExistente.id : resultado.id);

    await registrarAccion(
      app,
      asignadoPorId,
      "CREAR_ASIGNACION",
      `Asignó el pedido #${pedidoId} al entregador #${entregadorId}.`,
    );

    return final;
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
      const sedes = sedesOperativas(usuario);
      where.OR = [
        { pedido: { sedeId: { in: sedes } } },
        { pedido: { creador: { sedeId: { in: sedes } } } },
      ];
    }

    return this.prisma.asignacionEntrega.findMany({
      where,
      include: {
        pedido: {
          select: {
            id: true,
            estado: true,
            direccion: true,
            observaciones: true,
            sedeId: true,
            creador: { select: { sedeId: true } },
            cliente: { select: { id: true, nombre: true, telefono: true, saldoDeuda: true } },
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
      const sedes = sedesOperativas(usuario);
      const sedePedido = asignacion.pedido?.sedeId ?? asignacion.pedido?.creador?.sedeId;
      if (sedePedido == null || !sedes.includes(sedePedido)) {
        throw new AppError("No tienes permiso para ver esta asignación.", 403);
      }
    }

    return asignacion;
  },

  /**
   * El entregador actualiza el estado de su asignación.
   */
  async actualizarEstado(id, body, usuarioId, rolUsuario, sedeIdUsuario) {
    if (!["Admin", "AdminBogota", "Entregador"].includes(rolUsuario)) {
      throw new AppError("No tienes permiso para actualizar asignaciones.", 403);
    }

    const asignacion = await this.repo.findById(id);
    if (!asignacion) throw new AppError(`Asignaci\u00F3n ${id} no encontrada`, 404);

    if (rolUsuario === "Entregador" && asignacion.entregadorId !== usuarioId) {
      throw new AppError("No tienes permiso para actualizar esta asignaci\u00F3n", 403);
    }

    if (rolUsuario !== "Admin" && rolUsuario !== "Entregador" && sedeIdUsuario != null) {
      const sedes = sedesOperativas({ rol: rolUsuario, sedeId: sedeIdUsuario });
      const sedePedido = asignacion.pedido?.sedeId ?? asignacion.pedido?.creador?.sedeId;
      if (sedePedido == null || !sedes.includes(sedePedido)) {
        throw new AppError("No tienes permiso para actualizar esta asignaci\u00F3n.", 403);
      }
    }

    const transiciones = {
      Pendiente:  ["EnRuta", "Fallido"],
      EnRuta:     ["Entregado", "Fallido"],
      Entregado:  [],
      Fallido:    [],
    };

    const {
      nuevoEstado,
      montoCobrado,
      metodoPago,
      montoEfectivo,
      montoTransferencia,
      abonoDeuda,
      observacionesEntrega,
      fechaConfirmada,
    } = body;

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

      const monto = Number(montoCobrado);
      if (Number.isNaN(monto) || monto < 0) {
        throw new AppError("montoCobrado inválido", 400);
      }

      const abono = Number(abonoDeuda ?? 0);
      if (Number.isNaN(abono) || abono < 0) {
        throw new AppError("abonoDeuda inválido", 400);
      }

      let efectivo = null;
      let transferencia = null;

      if (metodoPago === "Mixto") {
        if (
          montoEfectivo === undefined || montoEfectivo === null ||
          montoTransferencia === undefined || montoTransferencia === null
        ) {
          throw new AppError(
            "Para metodoPago Mixto se requieren montoEfectivo y montoTransferencia",
            400,
          );
        }
        efectivo = Number(montoEfectivo);
        transferencia = Number(montoTransferencia);
        if (
          Number.isNaN(efectivo) || Number.isNaN(transferencia) ||
          efectivo < 0 || transferencia < 0
        ) {
          throw new AppError("montoEfectivo/montoTransferencia inválidos", 400);
        }
        if (Math.abs(efectivo + transferencia - monto) > 0.01) {
          throw new AppError(
            "montoEfectivo + montoTransferencia debe ser igual a montoCobrado",
            400,
          );
        }
      }

      if (metodoPago === "Credito" && monto !== 0) {
        throw new AppError("Con metodoPago Credito, montoCobrado debe ser 0", 400);
      }

      const clienteId = asignacion.pedido?.cliente?.id ?? asignacion.pedido?.clienteId;
      if (!clienteId) {
        throw new AppError("No se pudo determinar el cliente del pedido.", 400);
      }

      if (abono > 0) {
        const saldoActual = Number(asignacion.pedido?.cliente?.saldoDeuda ?? 0);
        if (abono > saldoActual) {
          throw new AppError(
            `El abono (${abono}) no puede ser mayor al saldo deudor actual del cliente (${saldoActual}).`,
            400,
          );
        }
      }

      // Determina cuánto de lo cobrado va como efectivo vs. cuentas/
      // transferencia, para poder reflejarlo en Contabilidad > Ingresos.
      // Crédito no cobra nada ahora mismo, así que no genera ingreso.
      let efectivoIngreso = 0;
      let cuentasIngreso = 0;
      if (metodoPago === "Mixto") {
        efectivoIngreso = efectivo;
        cuentasIngreso = transferencia;
      } else if (metodoPago === "Transferencia") {
        cuentasIngreso = monto;
      } else if (metodoPago === "Efectivo" || metodoPago === "Parcial") {
        efectivoIngreso = monto;
      }

      const fechaConfirmacion = fechaConfirmada ? new Date(fechaConfirmada) : new Date();
      const fechaMovimiento   = inicioDiaLocal(fechaConfirmacion);
      // La sede del cobro es la del cliente (oficina); si el cliente no
      // tiene sede asignada, se usa la del pedido (bodega).
      const sedeCobro = asignacion.pedido?.cliente?.sedeId ?? asignacion.pedido?.sedeId;

      await this.prisma.$transaction(async (tx) => {
        await tx.asignacionEntrega.update({
          where: { id },
          data: {
            estado:               "Entregado",
            montoCobrado:         monto,
            montoEfectivo:        efectivo,
            montoTransferencia:   transferencia,
            abonoDeuda:           abono,
            metodoPago,
            fechaConfirmada:      fechaConfirmacion,
            observacionesEntrega: observacionesEntrega ?? asignacion.observacionesEntrega,
          },
        });

        await tx.pedido.update({
          where: { id: asignacion.pedidoId },
          data:  { estado: "Entregado", totalRecibido: monto },
        });

        await tx.cliente.update({
          where: { id: clienteId },
          data:  { saldoDeuda: { decrement: monto + abono } },
        });

        // Registra el cobro como Ingreso de Contabilidad, para que la
        // plata que recibe el entregador quede reflejada ahí y no solo
        // en el pedido/cliente. Se marca el origen para que el usuario
        // pueda identificar el registro automático y evitar duplicados.
        if ((efectivoIngreso + cuentasIngreso) > 0 && sedeCobro != null) {
          await ingresoRepo.crear(tx, {
            fecha: fechaMovimiento,
            semana: semanaNegocio(fechaMovimiento),
            sedeId: sedeCobro,
            efectivo: efectivoIngreso,
            cuentas: cuentasIngreso,
            total: efectivoIngreso + cuentasIngreso,
            origen: ORIGENES.ENTREGA,
            idReferencia: id,
            observacion: `Cobro entrega pedido #${asignacion.pedidoId} (asignación #${id})`,
          });
        }

        // El abono a deuda anterior que recibe el entregador es también un
        // cobro: se registra como Ingreso (efectivo por defecto) para que
        // aparezca en Contabilidad (ingresos, arqueo y panel) igual que en
        // el corte de caja.
        if (abono > 0 && sedeCobro != null) {
          await ingresoRepo.crear(tx, {
            fecha: fechaMovimiento,
            semana: semanaNegocio(fechaMovimiento),
            sedeId: sedeCobro,
            efectivo: abono,
            cuentas: 0,
            total: abono,
            origen: ORIGENES.ABONO_DEUDA_ENTREGA,
            idReferencia: id,
            observacion: `Abono a deuda anterior del cliente (asignación #${id})`,
          });
        }
      });

      const detalleAbono = abono > 0 ? `, + abono de ${abono} a deuda anterior` : "";
      await registrarAccion(
        app,
        usuarioId,
        "CONFIRMAR_ENTREGA",
        `Confirmó la entrega #${id} del pedido #${asignacion.pedidoId} (cobró ${monto} vía ${metodoPago}${detalleAbono}).`,
      );

      return this.repo.findById(id);
    }

    const dataUpdate = { estado: nuevoEstado };
    if (observacionesEntrega) dataUpdate.observacionesEntrega = observacionesEntrega;

    if (nuevoEstado === "Fallido") {
      await this.prisma.$transaction(async (tx) => {
        await tx.asignacionEntrega.update({ where: { id }, data: dataUpdate });
        await tx.pedido.update({ where: { id: asignacion.pedidoId }, data: { estado: "Pendiente" } });
      });
      await registrarAccion(
        app,
        usuarioId,
        "MARCAR_ENTREGA_FALLIDA",
        `Marcó como fallida la entrega #${id} del pedido #${asignacion.pedidoId}.`,
      );
      return this.repo.findById(id);
    }

    const actualizado = await this.repo.update(id, dataUpdate);
    await registrarAccion(
      app,
      usuarioId,
      "ACTUALIZAR_ASIGNACION",
      `Actualizó la asignación #${id} a estado "${nuevoEstado}".`,
    );
    return actualizado;
  },
});

module.exports = (app) => asignacionService(app);