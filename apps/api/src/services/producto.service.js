const repo     = require("../repositories/producto.repository");
const AppError = require("../errors/AppError");

/**
 * producto.service.js
 * Lógica de negocio del módulo Producto.
 */

async function crear(app, body) {
  // Verificar que no exista ya el código
  const existente = await repo.buscarPorCodigo(app.prisma, body.codigo);
  if (existente) throw new AppError(`Ya existe un producto con el código ${body.codigo}`, 409);

  if (body.proveedorId) {
    const proveedor = await app.prisma.proveedor.findUnique({ where: { id: body.proveedorId } });
    if (!proveedor) throw new AppError(`Proveedor ${body.proveedorId} no encontrado`, 404);
  }

  return repo.crear(app.prisma, body);
}

async function obtenerLista(app, query) {
  const filtros = {
    skip: Number(query.skip ?? 0),
    take: Number(query.take ?? 50),
  };
  if (query.descripcion)  filtros.descripcion  = query.descripcion;
  if (query.proveedorId)  filtros.proveedorId  = Number(query.proveedorId);
  if (query.activo !== undefined) filtros.activo = query.activo === "true";
  return repo.listar(app.prisma, filtros);
}

async function obtenerPorCodigo(app, codigo) {
  const producto = await repo.buscarPorCodigo(app.prisma, codigo);
  if (!producto) throw new AppError(`Producto ${codigo} no encontrado`, 404);
  return producto;
}

async function editar(app, codigo, body) {
  await obtenerPorCodigo(app, codigo); // valida existencia

  if (body.proveedorId) {
    const proveedor = await app.prisma.proveedor.findUnique({ where: { id: body.proveedorId } });
    if (!proveedor) throw new AppError(`Proveedor ${body.proveedorId} no encontrado`, 404);
  }

  return repo.actualizar(app.prisma, codigo, body);
}

async function desactivar(app, codigo) {
  await obtenerPorCodigo(app, codigo);
  return repo.actualizar(app.prisma, codigo, { activo: false });
}

module.exports = { crear, obtenerLista, obtenerPorCodigo, editar, desactivar };
