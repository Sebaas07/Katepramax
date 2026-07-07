const repo = require("../repositories/inventario.repository");
const AppError = require("../errors/AppError");
const { registrarAccion } = require("../utils/logger");

function sedeEsPermitida(usuario) {
  return (
    usuario.rol === "Admin" ||
    usuario.rol === "Bodega" ||
    usuario.rol === "AdminBogota"
  );
}

/**
 * Calcula el delta de stock según el tipo de movimiento.
 * - entrada:  suma la cantidad (positivo)
 * - salida:   resta la cantidad (negativo)
 * - ajuste:   aplica la cantidad tal cual (puede ser negativo)
 */
function calcularDelta(tipo, cantidad) {
  if (tipo === "salida") return -Math.abs(cantidad);
  if (tipo === "ajuste") return cantidad;
  return Math.abs(cantidad); // entrada por defecto
}

async function registrar(app, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para registrar inventario.", 403);
  }

  const sedeId = Number(body.sedeId);
  if (usuario.rol !== "Admin" && sedeId !== usuario.sedeId) {
    throw new AppError("No puedes registrar inventario en otra sede.", 403);
  }

  const sede = await app.prisma.sede.findUnique({ where: { id: sedeId } });
  if (!sede) throw new AppError(`Sede ${sedeId} no encontrada`, 404);

  const producto = await app.prisma.producto.findUnique({
    where: { codigo: body.productoId },
  });
  if (!producto)
    throw new AppError(`Producto "${body.productoId}" no encontrado`, 404);
  if (!producto.activo)
    throw new AppError(`Producto "${body.productoId}" está inactivo`, 422);

  const fecha = new Date(body.fecha);
  fecha.setUTCHours(0, 0, 0, 0);

  const tipo = body.tipo ?? "entrada";
  const cantidad = Number(body.cantidadIngresada);
  const costoUnitarioRegistro =
    body.costoUnitario ?? Number(producto.precioCosto);

  const delta = calcularDelta(tipo, cantidad);

  // FIX: validar que una salida no deje stock negativo
  if (tipo === "salida") {
    const stockActual = await app.prisma.stockSede.findUnique({
      where: { sedeId_productoId: { sedeId, productoId: body.productoId } },
    });
    const disponible = stockActual?.stockActual ?? 0;
    if (disponible + delta < 0) {
      throw new AppError(
        `Stock insuficiente para registrar la salida. Disponible: ${disponible}, solicitado: ${Math.abs(delta)}`,
        422,
      );
    }
  }

  const registro = await repo.crear(app.prisma, {
    fecha,
    semana: body.semana,
    sedeId,
    productoId: body.productoId,
    cantidadIngresada: delta,
    costoUnitario: costoUnitarioRegistro,
    tipo,
    nota: body.nota ?? null,
  });

  await app.prisma.stockSede.upsert({
    where: { sedeId_productoId: { sedeId, productoId: body.productoId } },
    update: { stockActual: { increment: delta } },
    create: {
      sedeId,
      productoId: body.productoId,
      stockActual: Math.max(0, delta),
    },
  });

  await registrarAccion(
    app,
    usuario.id,
    "REGISTRAR_INVENTARIO",
    `Registró un movimiento de tipo "${tipo}" (${delta}) para el producto "${body.productoId}" en sede ${sedeId}.`,
  );

  return registro;
}

async function obtenerLista(app, query, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para listar inventario.", 403);
  }

  const filtros = {
    skip: Number(query.skip ?? 0),
    take: Number(query.take ?? 50),
  };
  if (query.fecha) filtros.fecha = new Date(query.fecha);
  if (query.semana) filtros.semana = Number(query.semana);
  if (query.productoId) filtros.productoId = query.productoId;
  if (query.tipo) filtros.tipo = query.tipo;

  if (usuario.rol !== "Admin") {
    filtros.sedeId = usuario.sedeId;
  } else if (query.sedeId) {
    filtros.sedeId = Number(query.sedeId);
  }

  return repo.listar(app.prisma, filtros);
}

async function obtenerPorId(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para ver este registro.", 403);
  }

  const registro = await repo.buscarPorId(app.prisma, id);
  if (!registro)
    throw new AppError(`Registro de inventario ${id} no encontrado`, 404);

  if (usuario.rol !== "Admin" && registro.sedeId !== usuario.sedeId) {
    throw new AppError("No tienes permiso para ver este registro.", 403);
  }

  return registro;
}

async function editar(app, id, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para editar inventario.", 403);
  }

  const anterior = await repo.buscarPorId(app.prisma, id);
  if (!anterior) {
    throw new AppError(`Registro de inventario ${id} no encontrado`, 404);
  }

  if (usuario.rol !== "Admin" && anterior.sedeId !== usuario.sedeId) {
    throw new AppError("No tienes permiso para editar este registro.", 403);
  }

  // FIX: recalcular el delta correctamente considerando el tipo nuevo vs anterior
  // Si cambia la cantidad O el tipo, hay que revertir el delta anterior y aplicar el nuevo
  const cambiaAmount = body.cantidadIngresada !== undefined;
  const cambiaTipo = body.tipo !== undefined && body.tipo !== anterior.tipo;

  let deltaAjuste = 0;

  if (cambiaAmount || cambiaTipo) {
    const tipoNuevo = body.tipo ?? anterior.tipo;
    const cantidadNueva =
      body.cantidadIngresada !== undefined
        ? Number(body.cantidadIngresada)
        : Math.abs(anterior.cantidadIngresada); // cantidad original sin signo

    const deltaNuevo = calcularDelta(tipoNuevo, cantidadNueva);
    const deltaAnterior = anterior.cantidadIngresada; // ya tiene signo guardado
    deltaAjuste = deltaNuevo - deltaAnterior;

    // Sobreescribir cantidadIngresada en body con el valor ya con signo correcto
    body = { ...body, cantidadIngresada: deltaNuevo };
  }

  const actualizado = await repo.actualizar(app.prisma, id, body);

  if (deltaAjuste !== 0) {
    const { sedeId, productoId } = anterior;
    await app.prisma.stockSede.upsert({
      where: { sedeId_productoId: { sedeId, productoId } },
      update: { stockActual: { increment: deltaAjuste } },
      create: { sedeId, productoId, stockActual: Math.max(0, deltaAjuste) },
    });
  }

  await registrarAccion(
    app,
    usuario.id,
    "EDITAR_INVENTARIO",
    `Editó el movimiento de inventario #${id}.`,
  );

  return actualizado;
}

async function borrar(app, id, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para eliminar inventario.", 403);
  }

  const registro = await repo.buscarPorId(app.prisma, id);
  if (!registro) {
    throw new AppError(`Registro de inventario ${id} no encontrado`, 404);
  }

  if (usuario.rol !== "Admin" && registro.sedeId !== usuario.sedeId) {
    throw new AppError("No tienes permiso para eliminar este registro.", 403);
  }

  // FIX: validar que revertir el movimiento no deje stock negativo
  // Solo aplica si el registro era una entrada (delta positivo)
  if (registro.cantidadIngresada > 0) {
    const stockActual = await app.prisma.stockSede.findUnique({
      where: {
        sedeId_productoId: {
          sedeId: registro.sedeId,
          productoId: registro.productoId,
        },
      },
    });
    const disponible = stockActual?.stockActual ?? 0;
    if (disponible - registro.cantidadIngresada < 0) {
      throw new AppError(
        `No se puede eliminar este registro: dejaría el stock en negativo. Stock actual: ${disponible}, entrada a revertir: ${registro.cantidadIngresada}`,
        422,
      );
    }
  }

  // Usar transacción para que el borrado y el ajuste de stock sean atómicos
  await app.prisma.$transaction(async (tx) => {
    await tx.inventario.delete({ where: { id } });

    await tx.stockSede.update({
      where: {
        sedeId_productoId: {
          sedeId: registro.sedeId,
          productoId: registro.productoId,
        },
      },
      // cantidadIngresada ya tiene signo (positivo = entrada, negativo = salida)
      // Al borrar, revertimos: restamos lo que se había sumado (o sumamos lo que se restó)
      data: { stockActual: { decrement: registro.cantidadIngresada } },
    });
  });

  await registrarAccion(
    app,
    usuario.id,
    "ELIMINAR_INVENTARIO",
    `Eliminó el movimiento de inventario #${id} (producto "${registro.productoId}", sede ${registro.sedeId}).`,
  );
}
async function resumenSemanal(app, semana, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para ver el resumen semanal.", 403);
  }

  const prisma = app.prisma;
  const sedes = await prisma.sede.findMany({
    where: { activo: true },
    select: { id: true, nombre: true },
  });

  const where = usuario.rol !== "Admin" ? { sedeId: usuario.sedeId } : {};

  const filas = await prisma.inventario.groupBy({
    by: ["sedeId", "productoId"],
    where: { ...where, semana },
    _sum: { cantidadIngresada: true, costoUnitario: true },
    orderBy: { sedeId: "asc" },
  });

  const productos = await prisma.producto.findMany({
    select: { codigo: true, descripcion: true },
  });
  const mapaProducto = Object.fromEntries(
    productos.map((p) => [p.codigo, p.descripcion]),
  );

  const sedesFiltradas =
    usuario.rol === "Admin"
      ? sedes
      : sedes.filter((s) => s.id === usuario.sedeId);

  const resultado = [];
  for (const sede of sedesFiltradas) {
    const filasSede = filas.filter((f) => f.sedeId === sede.id);
    for (const fila of filasSede) {
      resultado.push({
        sede: sede.nombre,
        sedeId: sede.id,
        producto: mapaProducto[fila.productoId] ?? String(fila.productoId),
        productoId: fila.productoId,
        cantidad: fila._sum.cantidadIngresada ?? 0,
        costoUnitario: Number(fila._sum.costoUnitario ?? 0),
      });
    }
  }

  return resultado;
}

module.exports = {
  registrar,
  obtenerLista,
  obtenerPorId,
  editar,
  borrar,
  resumenSemanal,
};
