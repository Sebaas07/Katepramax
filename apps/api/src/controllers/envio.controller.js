const envioService = require("../services/envio.service");

async function crear(request, reply) {
  const svc = envioService(request.server);
  const result = await svc.crear(request.body, request.user);
  return reply.code(201).send(result);
}

async function listar(request, reply) {
  const svc = envioService(request.server);
  const result = await svc.listar(request.query, request.user);
  return reply.send(result);
}

async function contarPendientes(request, reply) {
  const svc = envioService(request.server);
  const pendientes = await svc.contarPendientes(request.user);
  return reply.send({ pendientes });
}

async function obtenerPorId(request, reply) {
  const svc = envioService(request.server);
  const result = await svc.obtenerPorId(Number(request.params.id), request.user);
  return reply.send(result);
}

async function confirmar(request, reply) {
  const svc = envioService(request.server);
  const result = await svc.confirmar(Number(request.params.id), request.body, request.user);
  return reply.send(result);
}

async function cancelar(request, reply) {
  const svc = envioService(request.server);
  const result = await svc.cancelar(Number(request.params.id), request.user);
  return reply.send(result);
}

module.exports = { crear, listar, contarPendientes, obtenerPorId, confirmar, cancelar };
