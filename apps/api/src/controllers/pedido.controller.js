const svc = require("../services/pedido.service");

/**
 * Delega en el servicio; sólo traduce request/reply.
 */

async function crear(request, reply) {
  // El usuarioId viene del token JWT, no del body
  const pedido = await svc.crear(request.server, request.body, request.user.id);
  return reply.code(201).send(pedido);
}

async function listar(request, reply) {
  const lista = await svc.obtenerLista(request.server, request.query, request.user);
  return reply.send(lista);
}

async function obtenerPorId(request, reply) {
  const pedido = await svc.obtenerPorId(request.server, Number(request.params.id));
  return reply.send(pedido);
}

async function cambiarEstado(request, reply) {
  const actualizado = await svc.cambiarEstado(
    request.server,
    Number(request.params.id),
    request.body.estado,
  );
  return reply.send(actualizado);
}

module.exports = { crear, listar, obtenerPorId, cambiarEstado };
