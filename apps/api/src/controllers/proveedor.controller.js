/**
 * Traduce request/reply — toda la lógica vive en el servicio.
 */

const proveedorService = require("../services/proveedor.service");

async function listar(request, reply) {
  const svc    = proveedorService(request.server);
  const result = await svc.listar(request.query);
  return reply.send(result);
}

async function obtenerPorId(request, reply) {
  const svc    = proveedorService(request.server);
  const result = await svc.obtenerPorId(Number(request.params.id));
  return reply.send(result);
}

async function crear(request, reply) {
  const svc    = proveedorService(request.server);
  const result = await svc.crear(request.body);
  return reply.code(201).send(result);
}

async function actualizar(request, reply) {
  const svc    = proveedorService(request.server);
  const result = await svc.actualizar(Number(request.params.id), request.body);
  return reply.send(result);
}

async function desactivar(request, reply) {
  const svc    = proveedorService(request.server);
  const result = await svc.desactivar(Number(request.params.id));
  return reply.send(result);
}

module.exports = { listar, obtenerPorId, crear, actualizar, desactivar };
