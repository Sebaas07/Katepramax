const logService = require("../services/log.service");

async function listar(request, reply) {
  const svc = logService(request.server);
  const resultado = await svc.listar(request.query, request.user);
  return reply.send(resultado);
}

async function listarAcciones(request, reply) {
  const svc = logService(request.server);
  const resultado = await svc.listarAcciones(request.user);
  return reply.send(resultado);
}

module.exports = { listar, listarAcciones };
