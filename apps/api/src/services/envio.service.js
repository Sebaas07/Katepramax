/**
 * Lógica de negocio de las guías de envío de mercancía entre sedes.
 *
 * Flujo:
 *  1. Admin / AdminBogota crea un envío hacia una o varias sedes destino,
 *     con una lista de productos y cantidades (la misma para cada sede
 *     destino). Se crea UNA fila Envio por cada sede destino, y se
 *     descuenta de una vez el stock de la sede origen (registrando la
 *     salida correspondiente en Inventario).
 *  2. La sede destino ve el envío como "Pendiente" (esto hace de
 *     notificación: aparece en su lista de "Envíos por confirmar").
 *  3. Al confirmar la recepción, por cada producto se indica cuánto
 *     realmente llegó. Si es menos de lo enviado (faltante o unidades
 *     dañadas), se exige una observación explicando la diferencia. Las
 *     unidades confirmadas entran de una vez al inventario de la sede
 *     destino (creando el registro de stock si el producto no existía
 *     ahí todavía).
 *  4. La sede origen puede CANCELAR un envío pendiente (antes de que la
 *     sede destino confirme). Al cancelar se devuelve el stock a la sede
 *     origen y se registra la reversión correspondiente en Inventario.
 */

const envioRepo = require("../repositories/envio.repository");
const AppError = require("../errors/AppError");
const { registrarAccion } = require("../utils/logger");

function puedeCrear(usuario) {
  return (
    usuario?.rol === "Admin" ||
    usuario?.rol === "AdminBogota" ||
    usuario?.rol === "Bodega"
  );
}

function puedeGestionar(usuario) {
  return (
    usuario?.rol === "Admin" ||
    usuario?.rol === "Bodega" ||
    usuario?.rol === "AdminBogota" ||
    usuario?.rol === "Oficinista"
  );
}

const envioService = (app) => ({
  repo: envioRepo(app.prisma),
  prisma: app.prisma,

  /**
   * Sede "operativa" de un usuario para el módulo de envíos.
   * Las oficinas (tipo Oficina) pertenecen a una bodega (bodegaId), así que
   * su sede operativa es la bodega: ven y confirman los envíos de su bodega.
   * Se resuelve en el auth middleware y viaja en `usuario.sedesOperativas`;
   * aquí solo se toma la primera sede cuando aplica.
   */
  sedeOperativa(usuario) {
    const sedes = usuario?.sedesOperativas;
    if (Array.isArray(sedes) && sedes.length === 1) return sedes[0];
    if (usuario?.sedeTipo === "Oficina" && usuario?.bodegaId) return usuario.bodegaId;
    return usuario?.sedeId ?? null;
  },

  /**
   * Crea una guía de envío hacia una o varias sedes destino.
   * body: { sedeOrigenId?, sedesDestinoIds: number[], detalles: [{productoId, cantidad}], observaciones? }
   */
  async crear(body, usuario) {
    if (!puedeCrear(usuario)) {
      throw new AppError("No tienes permiso para crear envíos entre sedes.", 403);
    }

    const sedeOrigenId =
      usuario.rol === "AdminBogota" || usuario.rol === "Bodega"
        ? (this.sedeOperativa(usuario) ?? usuario.sedeId)
        : Number(body.sedeOrigenId);

    if (!sedeOrigenId) {
      throw new AppError("Se requiere la sede de origen.", 400);
    }

    const sedesDestinoIds = Array.isArray(body.sedesDestinoIds)
      ? [...new Set(body.sedesDestinoIds.map(Number))]
      : [];

    if (sedesDestinoIds.length === 0) {
      throw new AppError("Debes seleccionar al menos una sede destino.", 400);
    }
    if (sedesDestinoIds.includes(sedeOrigenId)) {
      throw new AppError("La sede destino no puede ser igual a la sede origen.", 400);
    }

    const detalles = Array.isArray(body.detalles) ? body.detalles : [];
    if (detalles.length === 0) {
      throw new AppError("Debes agregar al menos un producto al envío.", 400);
    }
    for (const d of detalles) {
      const cantidad = Number(d.cantidad);
      if (!d.productoId || Number.isNaN(cantidad) || cantidad <= 0) {
        throw new AppError("Cada producto del envío requiere un productoId y una cantidad mayor a 0.", 400);
      }
    }

    const prisma = app.prisma;

    const sedeOrigen = await prisma.sede.findUnique({ where: { id: sedeOrigenId } });
    if (!sedeOrigen || !sedeOrigen.activo) {
      throw new AppError(`Sede origen ${sedeOrigenId} no encontrada o inactiva.`, 404);
    }
    if (sedeOrigen.tipo !== "Bodega") {
      throw new AppError("El origen de un envío debe ser una bodega.", 422);
    }

    const sedesDestino = await prisma.sede.findMany({
      where: { id: { in: sedesDestinoIds } },
    });
    if (sedesDestino.length !== sedesDestinoIds.length) {
      throw new AppError("Una o más sedes destino no existen.", 404);
    }
    const sedeInactiva = sedesDestino.find((s) => !s.activo);
    if (sedeInactiva) {
      throw new AppError(`La sede "${sedeInactiva.nombre}" está inactiva.`, 422);
    }
    const sedeNoBodega = sedesDestino.find((s) => s.tipo !== "Bodega");
    if (sedeNoBodega) {
      throw new AppError("Los envíos solo pueden ir a bodegas.", 422);
    }

    const productos = await prisma.producto.findMany({
      where: { codigo: { in: detalles.map((d) => Number(d.productoId)) } },
    });
    const mapaProducto = new Map(productos.map((p) => [p.codigo, p]));
    for (const d of detalles) {
      const producto = mapaProducto.get(Number(d.productoId));
      if (!producto) {
        throw new AppError(`Producto ${d.productoId} no encontrado.`, 404);
      }
      if (!producto.activo) {
        throw new AppError(`Producto "${producto.descripcion}" está inactivo.`, 422);
      }
    }

    // El mismo pedido se envía completo a cada sede destino, así que el
    // total que sale de la sede origen es cantidad * número de destinos.
    const numDestinos = sedesDestinoIds.length;
    const stockOrigen = await prisma.stockSede.findMany({
      where: {
        sedeId: sedeOrigenId,
        productoId: { in: detalles.map((d) => Number(d.productoId)) },
      },
    });
    const mapaStock = new Map(stockOrigen.map((s) => [s.productoId, s.stockActual]));

    for (const d of detalles) {
      const productoId = Number(d.productoId);
      const requerido = Number(d.cantidad) * numDestinos;
      const disponible = mapaStock.get(productoId) ?? 0;
      if (disponible < requerido) {
        const producto = mapaProducto.get(productoId);
        throw new AppError(
          `Stock insuficiente en la sede origen para "${producto.descripcion}". ` +
            `Disponible: ${disponible}, requerido para este envío: ${requerido}.`,
          422,
        );
      }
    }

    const nombresDestino = sedesDestino.map((s) => s.nombre).join(", ");

    const enviosCreados = await prisma.$transaction(async (tx) => {
      // 1) Descontar de la sede origen y registrar la salida en Inventario.
      const fecha = new Date();
      fecha.setUTCHours(0, 0, 0, 0);
      const semana = getSemanaISO(fecha);

      for (const d of detalles) {
        const productoId = Number(d.productoId);
        const cantidadTotal = Number(d.cantidad) * numDestinos;
        const producto = mapaProducto.get(productoId);

        await tx.inventario.create({
          data: {
            fecha,
            semana,
            sedeId: sedeOrigenId,
            productoId,
            cantidadIngresada: -cantidadTotal,
            costoUnitario: producto.precioCosto,
            tipo: "salida",
            nota: `Salida por envío a: ${nombresDestino}`,
          },
        });

        await tx.stockSede.update({
          where: { sedeId_productoId: { sedeId: sedeOrigenId, productoId } },
          data: { stockActual: { decrement: cantidadTotal } },
        });
      }

      // 2) Crear un Envio por cada sede destino, con su propia copia de detalles.
      const creados = [];
      for (const sedeDestinoId of sedesDestinoIds) {
        const envio = await tx.envio.create({
          data: {
            sedeOrigenId,
            sedeDestinoId,
            creadoPorId: usuario.id,
            observaciones: body.observaciones?.trim() || null,
            detalles: {
              create: detalles.map((d) => ({
                productoId: Number(d.productoId),
                cantidadEnviada: Number(d.cantidad),
              })),
            },
          },
          include: {
            sedeOrigen: { select: { id: true, nombre: true } },
            sedeDestino: { select: { id: true, nombre: true } },
            creador: { select: { id: true, nombreCompleto: true } },
            detalles: {
              include: { producto: { select: { codigo: true, descripcion: true, sku: true } } },
            },
          },
        });
        creados.push(envio);
      }

      return creados;
    });

    await registrarAccion(
      app,
      usuario.id,
      "CREAR_ENVIO",
      `Creó un envío desde "${sedeOrigen.nombre}" hacia: ${nombresDestino} (${detalles.length} producto(s)).`,
    );

    return enviosCreados;
  },

  /**
   * Lista envíos visibles para el usuario.
   * query: { direccion?: "enviados"|"recibidos", estado?, skip?, take? }
   *  - "enviados"  → envíos que salieron de mi sede
   *  - "recibidos" → envíos que llegan a mi sede
   *  - sin indicar → ambos (para Admin: todos)
   */
  async listar(query, usuario) {
    if (!puedeGestionar(usuario)) {
      throw new AppError("No tienes permiso para ver envíos.", 403);
    }

    const where = {};
    if (query.estado) where.estado = query.estado;

    if (usuario.rol !== "Admin") {
      const sedeId = (await this.sedeOperativa(usuario)) ?? usuario.sedeId;
      if (query.direccion === "enviados") where.sedeOrigenId = sedeId;
      else if (query.direccion === "recibidos") where.sedeDestinoId = sedeId;
      else {
        where.OR = [{ sedeOrigenId: sedeId }, { sedeDestinoId: sedeId }];
      }
    } else {
      if (query.direccion === "enviados" && query.sedeId) where.sedeOrigenId = Number(query.sedeId);
      else if (query.direccion === "recibidos" && query.sedeId) where.sedeDestinoId = Number(query.sedeId);
      else if (query.sedeId) {
        where.OR = [{ sedeOrigenId: Number(query.sedeId) }, { sedeDestinoId: Number(query.sedeId) }];
      }
    }

    return this.repo.listar({
      ...where,
      skip: Number(query.skip ?? 0),
      take: Number(query.take ?? 50),
    });
  },

  /** Cantidad de envíos pendientes por confirmar para el "aviso" de la sede destino. */
  async contarPendientes(usuario) {
    if (!puedeGestionar(usuario)) {
      throw new AppError("No tienes permiso para ver envíos.", 403);
    }
    const where = { estado: "Pendiente" };
    if (usuario.rol !== "Admin") {
      where.sedeDestinoId = (await this.sedeOperativa(usuario)) ?? usuario.sedeId;
    }
    return this.repo.contar(where);
  },

  async obtenerPorId(id, usuario) {
    if (!puedeGestionar(usuario)) {
      throw new AppError("No tienes permiso para ver envíos.", 403);
    }
    const envio = await this.repo.buscarPorId(id);
    if (!envio) throw new AppError(`Envío ${id} no encontrado.`, 404);

    const sedeOperativa = (await this.sedeOperativa(usuario)) ?? usuario.sedeId;
    if (
      usuario.rol !== "Admin" &&
      envio.sedeOrigenId !== sedeOperativa &&
      envio.sedeDestinoId !== sedeOperativa
    ) {
      throw new AppError("No tienes permiso para ver este envío.", 403);
    }
    return envio;
  },

  /**
   * Confirma la recepción de un envío en la sede destino.
   * Solo la sede DESTINO (la que recibe) puede confirmar; la sede que envió
   * no tiene permitido confirmar su propio envío. Aplica a todos los roles,
   * incluido Admin (que debe pertenecer a la sede destino).
   * body: { detalles: [{ envioDetalleId, cantidadRecibida, observacion? }], observacionRecepcion? }
   */
  async confirmar(id, body, usuario) {
    if (!puedeGestionar(usuario)) {
      throw new AppError("No tienes permiso para confirmar envíos.", 403);
    }

    const envio = await this.repo.buscarPorId(id);
    if (!envio) throw new AppError(`Envío ${id} no encontrado.`, 404);

    const sedeDestino = (await this.sedeOperativa(usuario)) ?? usuario.sedeId;
    if (envio.sedeDestinoId !== sedeDestino) {
      throw new AppError("Solo la sede destino puede confirmar la recepción de este envío.", 403);
    }
    if (envio.estado !== "Pendiente") {
      throw new AppError("Este envío ya fue confirmado anteriormente.", 409);
    }

    const detallesBody = Array.isArray(body.detalles) ? body.detalles : [];
    const idsEnvio = new Set(envio.detalles.map((d) => d.id));
    if (detallesBody.length !== envio.detalles.length) {
      throw new AppError("Debes confirmar la cantidad recibida de todos los productos del envío.", 400);
    }

    const porId = new Map(envio.detalles.map((d) => [d.id, d]));
    const lineas = [];
    let huboNovedad = false;

    for (const item of detallesBody) {
      const detalleId = Number(item.envioDetalleId);
      if (!idsEnvio.has(detalleId)) {
        throw new AppError(`El detalle ${detalleId} no pertenece a este envío.`, 400);
      }
      const original = porId.get(detalleId);
      const cantidadRecibida = Number(item.cantidadRecibida);

      if (Number.isNaN(cantidadRecibida) || cantidadRecibida < 0) {
        throw new AppError("La cantidad recibida no puede ser negativa.", 400);
      }
      if (cantidadRecibida > original.cantidadEnviada) {
        throw new AppError(
          `La cantidad recibida de "${original.producto.descripcion}" no puede ser mayor a la enviada (${original.cantidadEnviada}).`,
          400,
        );
      }

      const faltante = original.cantidadEnviada - cantidadRecibida;
      if (faltante > 0 && !item.observacion?.trim()) {
        throw new AppError(
          `Debes indicar una observación para "${original.producto.descripcion}": ¿cuánto faltó o llegó dañado?`,
          400,
        );
      }
      if (faltante > 0) huboNovedad = true;

      lineas.push({
        detalleId,
        productoId: original.productoId,
        cantidadRecibida,
        observacion: item.observacion?.trim() || null,
      });
    }

    const prisma = app.prisma;
    const fecha = new Date();
    fecha.setUTCHours(0, 0, 0, 0);
    const semana = getSemanaISO(fecha);

    await prisma.$transaction(async (tx) => {
      for (const linea of lineas) {
        await tx.envioDetalle.update({
          where: { id: linea.detalleId },
          data: { cantidadRecibida: linea.cantidadRecibida, observacion: linea.observacion },
        });

        if (linea.cantidadRecibida > 0) {
          const producto = await tx.producto.findUnique({ where: { codigo: linea.productoId } });

          await tx.inventario.create({
            data: {
              fecha,
              semana,
              sedeId: envio.sedeDestinoId,
              productoId: linea.productoId,
              cantidadIngresada: linea.cantidadRecibida,
              costoUnitario: producto?.precioCosto ?? 0,
              tipo: "entrada",
              nota: `Entrada por envío #${envio.id} desde ${envio.sedeOrigen.nombre}`,
            },
          });

          // Si el producto no tenía stock registrado en esta sede, se crea aquí.
          await tx.stockSede.upsert({
            where: {
              sedeId_productoId: { sedeId: envio.sedeDestinoId, productoId: linea.productoId },
            },
            update: { stockActual: { increment: linea.cantidadRecibida } },
            create: {
              sedeId: envio.sedeDestinoId,
              productoId: linea.productoId,
              stockActual: linea.cantidadRecibida,
            },
          });
        }
      }

      await tx.envio.update({
        where: { id },
        data: {
          estado: huboNovedad ? "ConNovedad" : "Confirmado",
          confirmadoPorId: usuario.id,
          fechaConfirmacion: new Date(),
          observacionRecepcion: body.observacionRecepcion?.trim() || null,
        },
      });
    });

    await registrarAccion(
      app,
      usuario.id,
      "CONFIRMAR_ENVIO",
      `Confirmó la recepción del envío #${id}${huboNovedad ? " con novedades (faltantes/daños)" : ""}.`,
    );

    return this.repo.buscarPorId(id);
  },

  /**
   * Cancela un envío pendiente desde la sede ORIGEN (la que lo despachó).
   * Solo se pueden cancelar envíos en estado "Pendiente" (todavía no
   * confirmados por la sede destino). Al cancelar se devuelve el stock a la
   * sede origen y se registra en Inventario una entrada compensatoria para
   * revertir la salida que se hizo al crear el envío.
   */
  async cancelar(id, usuario) {
    if (!puedeGestionar(usuario)) {
      throw new AppError("No tienes permiso para cancelar envíos.", 403);
    }

    const envio = await this.repo.buscarPorId(id);
    if (!envio) throw new AppError(`Envío ${id} no encontrado.`, 404);

    const sedeOrigen = (await this.sedeOperativa(usuario)) ?? usuario.sedeId;
    if (envio.sedeOrigenId !== sedeOrigen) {
      throw new AppError("Solo la sede que originó el envío puede cancelarlo.", 403);
    }
    if (envio.estado !== "Pendiente") {
      throw new AppError("Solo se pueden cancelar envíos pendientes de recepción.", 409);
    }

    const prisma = app.prisma;
    const fecha = new Date();
    fecha.setUTCHours(0, 0, 0, 0);
    const semana = getSemanaISO(fecha);

    await prisma.$transaction(async (tx) => {
      for (const detalle of envio.detalles) {
        const producto = await tx.producto.findUnique({ where: { codigo: detalle.productoId } });

        // Reversión de la salida registrada al crear el envío.
        await tx.inventario.create({
          data: {
            fecha,
            semana,
            sedeId: envio.sedeOrigenId,
            productoId: detalle.productoId,
            cantidadIngresada: detalle.cantidadEnviada,
            costoUnitario: producto?.precioCosto ?? 0,
            tipo: "entrada",
            nota: `Reversión por cancelación del envío #${envio.id} hacia ${envio.sedeDestino.nombre}`,
          },
        });

        await tx.stockSede.upsert({
          where: {
            sedeId_productoId: { sedeId: envio.sedeOrigenId, productoId: detalle.productoId },
          },
          update: { stockActual: { increment: detalle.cantidadEnviada } },
          create: {
            sedeId: envio.sedeOrigenId,
            productoId: detalle.productoId,
            stockActual: detalle.cantidadEnviada,
          },
        });
      }

      await tx.envio.update({
        where: { id },
        data: {
          estado: "Cancelado",
          canceladoPorId: usuario.id,
          fechaCancelacion: new Date(),
        },
      });
    });

    await registrarAccion(
      app,
      usuario.id,
      "CANCELAR_ENVIO",
      `Canceló el envío #${id} hacia "${envio.sedeDestino.nombre}".`,
    );

    return this.repo.buscarPorId(id);
  },
});

// Semana ISO simple (mismo criterio usado en el resto del backend: año+semana).
function getSemanaISO(fecha) {
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - inicioAnio) / 86400000 + 1) / 7);
}

module.exports = envioService;
