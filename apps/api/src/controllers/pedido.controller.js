const svc = require("../services/pedido.service");

async function crear(request, reply) {
  const pedido = await svc.crear(request.server, request.body, request.user.id);
  return reply.code(201).send(pedido);
}

async function listar(request, reply) {
  const lista = await svc.obtenerLista(request.server, request.query, request.user);
  return reply.send(lista);
}

async function obtenerPorId(request, reply) {
  const pedido = await svc.obtenerPorId(request.server, Number(request.params.id), request.user);
  return reply.send(pedido);
}

async function cambiarEstado(request, reply) {
  const actualizado = await svc.cambiarEstado(
    request.server,
    Number(request.params.id),
    request.body.estado,
    request.user,
  );
  return reply.send(actualizado);
}

async function obtenerHistorial(request, reply) {
  const historial = await svc.obtenerHistorial(request.server, Number(request.params.id), request.user);
  return reply.send(historial);
}

module.exports = { crear, listar, obtenerPorId, cambiarEstado, obtenerHistorial };
