const repo = require("../repositories/producto.repository");
const AppError = require("../errors/AppError");
const { registrarAccion } = require("../utils/logger");

const DECIMAL_FIELDS = [
  "precioCosto",
  "precioVenta",
  "precioMayoreo",
  "porcentajeGanancia",
];

function sanitizeProducto(item) {
  if (!item || typeof item !== "object") return item;
  const out = { ...item };
  for (const field of DECIMAL_FIELDS) {
    if (
      out[field] !== undefined &&
      out[field] !== null &&
      typeof out[field].toNumber === "function"
    ) {
      out[field] = out[field].toNumber();
    }
  }
  return out;
}

function sanitizeProductos(items) {
  if (!Array.isArray(items)) return items;
  return items.map(sanitizeProducto);
}

function sedeEsPermitida(usuario) {
  return (
    usuario &&
    (usuario.rol === "Admin" ||
      usuario.rol === "Bodega" ||
      usuario.rol === "AdminBogota")
  );
}

function sedeWhere(usuario) {
  if (usuario && usuario.rol !== "Admin" && usuario.sedeId != null) {
    return { sedeId: usuario.sedeId };
  }
  return {};
}

async function crear(app, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para crear productos.", 403);
  }

  const { sedeId: _sedeId, stockInicial, ...datosProducto } = body;

  let sedeId;
  if (usuario?.rol !== "Admin") {
    sedeId = usuario.sedeId;
  } else if (_sedeId !== undefined && _sedeId !== null && _sedeId !== "") {
    sedeId = Number(_sedeId);
    if (Number.isNaN(sedeId)) {
      throw new AppError("sedeId inválido", 400);
    }
  }

  if (datosProducto.proveedorId) {
    const proveedor = await app.prisma.proveedor.findUnique({
      where: { id: datosProducto.proveedorId },
    });
    if (!proveedor)
      throw new AppError(
        `Proveedor ${datosProducto.proveedorId} no encontrado`,
        404,
      );
  }

  if (datosProducto.codigo != null) {
    const existente = await app.prisma.producto.findUnique({
      where: { codigo: datosProducto.codigo },
    });
    if (existente)
      throw new AppError(`Ya existe un producto con código ${datosProducto.codigo}`, 409);
  }

  const nuevo = await repo.crear(app.prisma, datosProducto);

  const stockValue = stockInicial !== undefined && stockInicial !== null && stockInicial !== ""
    ? Number(stockInicial)
    : 0;

  if (sedeId) {
    await app.prisma.stockSede.upsert({
      where: {
        sedeId_productoId: {
          sedeId: Number(sedeId),
          productoId: nuevo.codigo,
        },
      },
      create: {
        productoId: nuevo.codigo,
        sedeId: Number(sedeId),
        stockActual: Number.isFinite(stockValue) ? stockValue : 0,
      },
      update: {},
    });
  }

  const resultado = sanitizeProducto(await repo.buscarPorCodigo(app.prisma, nuevo.codigo));
  await registrarAccion(app, usuario.id, "CREAR_PRODUCTO", `Creó el producto "${nuevo.descripcion ?? nuevo.codigo}" (código ${nuevo.codigo}).`);
  return resultado;
}

async function obtenerLista(app, query, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para listar productos.", 403);
  }

  const filtros = {
    skip: Math.max(0, Number(query.skip) || 0),
    take: Math.min(200, Math.max(1, Number(query.take) || 50)),
  };
  if (query.descripcion) filtros.descripcion = String(query.descripcion);
  if (query.proveedorId) filtros.proveedorId = Number(query.proveedorId);
  if (query.activo !== undefined) filtros.activo = query.activo === "true";
  if (query.departamento) filtros.departamento = String(query.departamento);

  const sede = sedeWhere(usuario);
  if (sede.sedeId != null) filtros.sedeId = sede.sedeId;

  const lista = await repo.listar(app.prisma, filtros);
  return sanitizeProductos(lista);
}

async function obtenerPorCodigo(app, codigo, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para ver productos.", 403);
  }

  const producto = await repo.buscarPorCodigo(app.prisma, codigo);
  if (!producto) throw new AppError(`Producto ${codigo} no encontrado`, 404);

  if (usuario?.rol !== "Admin") {
    const sedeId = usuario.sedeId;
    const tieneStock = producto.stockSedes?.some(
      (s) => Number(s.sedeId) === Number(sedeId),
    );
    if (!tieneStock) {
      throw new AppError("No tienes permiso para ver este producto.", 403);
    }
  }

  return sanitizeProducto(producto);
}

async function editar(app, codigo, body, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para editar productos.", 403);
  }

  const producto = await repo.buscarPorCodigo(app.prisma, codigo);
  if (!producto) throw new AppError(`Producto ${codigo} no encontrado`, 404);

  if (usuario?.rol !== "Admin") {
    const sedeId = usuario.sedeId;
    const tieneStock = producto.stockSedes?.some(
      (s) => Number(s.sedeId) === Number(sedeId),
    );
    if (!tieneStock) {
      throw new AppError("No tienes permiso para editar este producto.", 403);
    }
  }

  if (body.proveedorId) {
    const proveedor = await app.prisma.proveedor.findUnique({
      where: { id: body.proveedorId },
    });
    if (!proveedor)
      throw new AppError(`Proveedor ${body.proveedorId} no encontrado`, 404);
  }

  const actualizado = sanitizeProducto(
    await repo.actualizar(app.prisma, codigo, body),
  );
  await registrarAccion(app, usuario.id, "EDITAR_PRODUCTO", `Editó el producto "${producto.descripcion ?? codigo}" (código ${codigo}).`);
  return actualizado;
}

async function desactivar(app, codigo, usuario) {
  if (!sedeEsPermitida(usuario)) {
    throw new AppError("No tienes permiso para desactivar productos.", 403);
  }

  const producto = await repo.buscarPorCodigo(app.prisma, codigo);
  if (!producto) throw new AppError(`Producto ${codigo} no encontrado`, 404);

  if (usuario?.rol !== "Admin") {
    const sedeId = usuario.sedeId;
    const tieneStock = producto.stockSedes?.some(
      (s) => Number(s.sedeId) === Number(sedeId),
    );
    if (!tieneStock) {
      throw new AppError(
        "No tienes permiso para desactivar este producto.",
        403,
      );
    }
  }

  const resultado = sanitizeProducto(
    await repo.actualizar(app.prisma, codigo, { activo: false }),
  );
  await registrarAccion(app, usuario.id, "DESACTIVAR_PRODUCTO", `Desactivó el producto "${producto.descripcion ?? codigo}" (código ${codigo}).`);
  return resultado;
}

module.exports = {
  crear,
  obtenerLista,
  obtenerPorCodigo,
  editar,
  desactivar,
};