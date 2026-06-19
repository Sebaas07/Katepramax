const repo = require("../repositories/producto.repository");
const AppError = require("../errors/AppError");

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

/**
 * producto.service.js
 * Lógica de negocio del módulo Producto.
 */

async function crear(app, body) {
  const existente = await repo.buscarPorCodigo(app.prisma, body.codigo);
  if (existente)
    throw new AppError(
      `Ya existe un producto con el código ${body.codigo}`,
      409,
    );

  if (body.proveedorId) {
    const proveedor = await app.prisma.proveedor.findUnique({
      where: { id: body.proveedorId },
    });
    if (!proveedor)
      throw new AppError(`Proveedor ${body.proveedorId} no encontrado`, 404);
  }

  const nuevo = await repo.crear(app.prisma, body);

  // Crear registro de stock inicial en la sede indicada
  if (body.sedeId) {
    await app.prisma.stockSede.upsert({
      where: {
        productoId_sedeId: {
          productoId: nuevo.codigo,
          sedeId: Number(body.sedeId),
        },
      },
      create: {
        productoId: nuevo.codigo,
        sedeId: Number(body.sedeId),
        stockActual: 0,
      },
      update: {},
    });
  }

  return sanitizeProducto(await repo.buscarPorCodigo(app.prisma, nuevo.codigo));
}

async function obtenerLista(app, query) {
  const filtros = {
    skip: Math.max(0, Number(query.skip) || 0),
    take: Math.min(200, Math.max(1, Number(query.take) || 50)),
  };
  if (query.descripcion) filtros.descripcion = String(query.descripcion);
  if (query.proveedorId) filtros.proveedorId = Number(query.proveedorId);
  if (query.activo !== undefined) filtros.activo = query.activo === "true";
  if (query.departamento) filtros.departamento = String(query.departamento);

  const lista = await repo.listar(app.prisma, filtros);
  return sanitizeProductos(lista);
}
async function obtenerPorCodigo(app, codigo) {
  const producto = await repo.buscarPorCodigo(app.prisma, codigo);
  if (!producto) throw new AppError(`Producto ${codigo} no encontrado`, 404);
  return producto;
}

async function editar(app, codigo, body) {
  await obtenerPorCodigo(app, codigo); // valida existencia

  if (body.proveedorId) {
    const proveedor = await app.prisma.proveedor.findUnique({
      where: { id: body.proveedorId },
    });
    if (!proveedor)
      throw new AppError(`Proveedor ${body.proveedorId} no encontrado`, 404);
  }

  return repo.actualizar(app.prisma, codigo, body);
}

async function desactivar(app, codigo) {
  await obtenerPorCodigo(app, codigo);
  return repo.actualizar(app.prisma, codigo, { activo: false });
}

module.exports = { crear, obtenerLista, obtenerPorCodigo, editar, desactivar };
