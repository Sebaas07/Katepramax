const repo = require("../repositories/inventario.repository");
const AppError = require("../errors/AppError");
const { registrarAccion } = require("../utils/logger");
const { sedeEsPermitida, rangoDia, fechaValida, sedeWhere, semanaValida } = require("../utils/contabilidad");

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

// Sede de trabajo para el rol Bodega: la bodega de su oficina (resuelta en el
// auth middleware como `sedeOperativa`). Los demás roles usan su propia sede.
function sedeOperativa(usuario) {
  return usuario?.sedeOperativa ?? usuario?.sedeId ?? null;
}

async function registrar(app, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para registrar inventario.", 403);
  }

  const sedeId = Number(body.sedeId);
  if (usuario.rol !== "Admin" && sedeId !== sedeOperativa(usuario)) {
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

  // Proveedor de la compra (opcional) y monto de la deuda pendiente.
  let proveedorId = null;
  if (body.proveedorId !== undefined && body.proveedorId !== null) {
    const proveedor = await app.prisma.proveedor.findUnique({
      where: { id: Number(body.proveedorId) },
    });
    if (!proveedor)
      throw new AppError(`Proveedor ${body.proveedorId} no encontrado`, 404);
    if (!proveedor.activo)
      throw new AppError(`Proveedor "${proveedor.nombre}" está inactivo`, 422);
    proveedorId = proveedor.id;
  }

  let deuda = null;
  if (body.deuda !== undefined && body.deuda !== null) {
    deuda = Number(body.deuda);
    if (!Number.isFinite(deuda) || deuda < 0) {
      throw new AppError("La deuda debe ser un número mayor o igual a cero.", 400);
    }
  }

  const fecha = fechaValida(body.fecha);

  const tipo = body.tipo ?? "entrada";
  const cantidad = Number(body.cantidadIngresada);
  if (!Number.isFinite(cantidad)) {
    throw new AppError("La cantidad debe ser un número válido.", 400);
  }

  if (tipo === "ajuste") {
    if (cantidad === 0) {
      throw new AppError(
        "El ajuste no puede ser 0: indica si quieres sumar (+) o restar (-) unidades.",
        400,
      );
    }
  } else if (cantidad <= 0) {
    throw new AppError("La cantidad debe ser mayor a 0.", 400);
  }

  let costoUnitarioRegistro =
    body.costoUnitario ?? Number(producto.precioCosto);
  costoUnitarioRegistro = Number(costoUnitarioRegistro);
  if (!Number.isFinite(costoUnitarioRegistro) || costoUnitarioRegistro < 0) {
    throw new AppError("El costo unitario debe ser un número válido.", 400);
  }

  const delta = calcularDelta(tipo, cantidad);

  // Validar que una salida o un ajuste negativo no deje stock negativo
  const stockActual = await app.prisma.stockSede.findUnique({
    where: { sedeId_productoId: { sedeId, productoId: body.productoId } },
  });
  const disponible = stockActual?.stockActual ?? 0;
  if (disponible + delta < 0) {
    const razon = tipo === "ajuste" ? "ajuste" : "salida";
    throw new AppError(
      `Stock insuficiente para registrar la ${razon.toLowerCase() === "salida" ? "salida" : "el ajuste"}. Disponible: ${disponible}, solicitado: ${Math.abs(delta)}`,
      422,
    );
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
    proveedorId,
    deuda,
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
  if (query.fecha) filtros.fecha = rangoDia(query.fecha);
  if (query.semana) filtros.semana = Number(query.semana);
  if (query.productoId) filtros.productoId = query.productoId;
  if (query.tipo) filtros.tipo = query.tipo;

  if (usuario.rol !== "Admin") {
    filtros.sedeId = sedeOperativa(usuario);
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

  if (usuario.rol !== "Admin" && registro.sedeId !== sedeOperativa(usuario)) {
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

  if (usuario.rol !== "Admin" && anterior.sedeId !== sedeOperativa(usuario)) {
    throw new AppError("No tienes permiso para editar este registro.", 403);
  }

  const cambiaAmount = body.cantidadIngresada !== undefined;

  let deltaAjuste = 0;

  if (cambiaAmount) {
    const tipoNuevo = anterior.tipo;
    const cantidadNueva = Number(body.cantidadIngresada);
    if (!Number.isFinite(cantidadNueva)) {
      throw new AppError("La cantidad debe ser un número válido.", 400);
    }

    if (tipoNuevo === "ajuste") {
      if (cantidadNueva === 0) {
        throw new AppError(
          "El ajuste no puede ser 0: indica si quieres sumar (+) o restar (-) unidades.",
          400,
        );
      }
    } else if (cantidadNueva <= 0) {
      throw new AppError("La cantidad debe ser mayor a 0.", 400);
    }

    const deltaNuevo = calcularDelta(tipoNuevo, cantidadNueva);
    const deltaAnterior = anterior.cantidadIngresada; // ya tiene signo guardado
    deltaAjuste = deltaNuevo - deltaAnterior;

    // Validar que el nuevo estado no deje stock negativo
    if (deltaAjuste !== 0) {
      const stockActual = await app.prisma.stockSede.findUnique({
        where: {
          sedeId_productoId: {
            sedeId: anterior.sedeId,
            productoId: anterior.productoId,
          },
        },
      });
      const disponible = stockActual?.stockActual ?? 0;
      if (disponible + deltaAjuste < 0) {
        throw new AppError(
          `El cambio dejaría el stock en negativo. Stock actual: ${disponible}, variación: ${deltaAjuste}`,
          422,
        );
      }
    }

    // Sobreescribir cantidadIngresada en body con el valor ya con signo correcto
    body = { ...body, cantidadIngresada: deltaNuevo, tipo: tipoNuevo };
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

  if (usuario.rol !== "Admin" && registro.sedeId !== sedeOperativa(usuario)) {
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

  const where = usuario.rol !== "Admin" ? { sedeId: sedeOperativa(usuario) } : {};

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
      : sedes.filter((s) => s.id === sedeOperativa(usuario));

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

// Saldo de cuentas por pagar por proveedor: deuda registrada en entradas de
// inventario menos lo abonado. Filtra por sede del usuario (o por sedeId para Admin).
async function resumenDeudaProveedores(app, query, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para ver la deuda de proveedores.", 403);
  }

  const prisma = app.prisma;
  const where = sedeWhere(usuario);
  if (usuario.rol === "Admin" && query.sedeId) where.sedeId = Number(query.sedeId);
  if (query.semana) where.semana = semanaValida(query.semana);

  const [deudas, abonos] = await Promise.all([
    prisma.inventario.groupBy({
      by: ["proveedorId"],
      where: { ...where, proveedorId: { not: null } },
      _sum: { deuda: true },
    }),
    prisma.abono.groupBy({
      by: ["proveedorId"],
      where,
      _sum: { valorPagado: true },
    }),
  ]);

  const proveedores = await prisma.proveedor.findMany({
    select: { id: true, nombre: true },
  });
  const mapa = Object.fromEntries(proveedores.map((p) => [p.id, p.nombre]));

  const filas = new Map();
  for (const f of deudas) {
    if (f.proveedorId == null) continue;
    filas.set(f.proveedorId, {
      proveedorId: f.proveedorId,
      deudaPendiente: Number(f._sum.deuda ?? 0),
      totalAbonado: 0,
    });
  }
  for (const f of abonos) {
    const actual = filas.get(f.proveedorId) ?? {
      proveedorId: f.proveedorId,
      deudaPendiente: 0,
      totalAbonado: 0,
    };
    actual.totalAbonado = Number(f._sum.valorPagado ?? 0);
    filas.set(f.proveedorId, actual);
  }

  return [...filas.values()]
    .map((f) => ({
      proveedor: mapa[f.proveedorId] ?? `Proveedor ${f.proveedorId}`,
      ...f,
      saldoPendiente: Math.max(0, f.deudaPendiente - f.totalAbonado),
    }))
    .sort((a, b) => b.saldoPendiente - a.saldoPendiente);
}

module.exports = {
  registrar,
  obtenerLista,
  obtenerPorId,
  editar,
  borrar,
  resumenSemanal,
  resumenDeudaProveedores,
};
