const asignacionService = require("../services/asignacion.service");

async function crear(request, reply) {
  const svc    = asignacionService(request.server);
  const result = await svc.crear(request.body, request.user.id, request.user);
  return reply.code(201).send(result);
}

async function listar(request, reply) {
  const svc    = asignacionService(request.server);
  const result = await svc.listar(request.query, request.user);
  return reply.send(result);
}

async function misEntregas(request, reply) {
  const svc    = asignacionService(request.server);
  const result = await svc.misEntregas(request.user.id, request.query);
  return reply.send(result);
}

async function obtenerPorId(request, reply) {
  const svc    = asignacionService(request.server);
  const result = await svc.obtenerPorId(Number(request.params.id), request.user);
  return reply.send(result);
}

async function actualizarEstado(request, reply) {
  const svc    = asignacionService(request.server);
  const result = await svc.actualizarEstado(
    Number(request.params.id),
    request.body,
    request.user.id,
    request.user.rol,
    request.user.sedeId,
  );
  return reply.send(result);
}

module.exports = { crear, listar, misEntregas, obtenerPorId, actualizarEstado };
