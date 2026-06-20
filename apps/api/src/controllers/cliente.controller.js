/**
 * Traduce request/reply — toda la lógica vive en el servicio.
 */

const clienteService = require("../services/cliente.service");

async function listar(request, reply) {
  const svc    = clienteService(request.server.prisma);
  const result = await svc.listar(request.query, request.user);
  return reply.send(result);
}

async function obtenerPorId(request, reply) {
  const svc    = clienteService(request.server.prisma);
  const result = await svc.obtenerPorId(Number(request.params.id), request.user);
  return reply.send(result);
}

async function crear(request, reply) {
  const svc    = clienteService(request.server.prisma);
  const result = await svc.crear(request.body);
  return reply.code(201).send(result);
}

async function actualizar(request, reply) {
  const svc    = clienteService(request.server.prisma);
  const result = await svc.actualizar(Number(request.params.id), request.body, request.user);
  return reply.send(result);
}

async function desactivar(request, reply) {
  const svc    = clienteService(request.server.prisma);
  const result = await svc.desactivar(Number(request.params.id), request.user);
  return reply.send(result);
}

module.exports = { listar, obtenerPorId, crear, actualizar, desactivar };
