const repo = require("../repositories/inventario.repository");
const AppError = require("../errors/AppError");

function sedeEsPermitida(usuario) {
  return usuario.rol === "Admin" || usuario.rol === "Bodega" || usuario.rol === "AdminBogota";
}

async function registrar(app, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para registrar inventario.", 403);
  }

  let sedeId = Number(body.sedeId);
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

  const delta =
    tipo === "salida"
      ? -Math.abs(cantidad)
      : tipo === "ajuste"
        ? cantidad
        : Math.abs(cantidad);

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
    where: {
      sedeId_productoId: { sedeId, productoId: body.productoId },
    },
    update: { stockActual: { increment: delta } },
    create: {
      sedeId,
      productoId: body.productoId,
      stockActual: Math.max(0, delta),
    },
  });

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

  const actualizado = await repo.actualizar(app.prisma, id, body);

  if (body.cantidadIngresada !== undefined) {
    const delta = body.cantidadIngresada - anterior.cantidadIngresada;
    const sedeId = anterior.sedeId;
    const productoId = anterior.productoId;

    await app.prisma.stockSede.upsert({
      where: {
        sedeId_productoId: { sedeId, productoId },
      },
      update: { stockActual: { increment: delta } },
      create: {
        sedeId,
        productoId,
        stockActual: Math.max(0, delta),
      },
    });
  }

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

  await repo.eliminar(app.prisma, id);

  await app.prisma.stockSede.update({
    where: {
      sedeId_productoId: {
        sedeId: registro.sedeId,
        productoId: registro.productoId,
      },
    },
    data: { stockActual: { decrement: registro.cantidadIngresada } },
  });
}

async function resumenSemanal(app, semana, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para ver el resumen semanal.", 403);
  }

  const prisma = app.prisma;
  const sedes  = await prisma.sede.findMany({ where: { activo: true }, select: { id: true, nombre: true } });
  const mapaSede = Object.fromEntries(sedes.map((s) => [s.id, s.nombre]));

  const where = usuario.rol !== "Admin" ? { sedeId: usuario.sedeId } : {};

  const filas = await prisma.inventario.groupBy({
    by:    ["sedeId", "productoId"],
    where: { ...where, semana },
    _sum:  { cantidadIngresada: true, costo: true },
    orderBy: { sedeId: "asc" },
  });

  const productos = await prisma.producto.findMany({
    select: { codigo: true, descripcion: true },
  });
  const mapaProducto = Object.fromEntries(
    productos.map((p) => [p.codigo, p.descripcion]),
  );

  const sedesFiltradas = usuario.rol === "Admin" ? sedes : sedes.filter((s) => s.id === usuario.sedeId);

  return sedesFiltradas.map((s) => ({
    sede:     s.nombre,
    sedeId:   s.id,
    detalle:  filas
      .filter((f) => f.sedeId === s.id)
      .map((f) => ({
        producto:  mapaProducto[f.productoId] ?? f.productoId,
        productoId: f.productoId,
        cantidad:  f._sum.cantidadIngresada,
        costo:     f._sum.costo,
      })),
  }));
}

module.exports = {
  registrar,
  obtenerLista,
  obtenerPorId,
  editar,
  borrar,
  resumenSemanal,
};
