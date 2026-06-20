const svc = require("../services/cartera.service");

async function crear(request, reply) {
  return reply.code(201).send(await svc.registrar(request.server, request.body, request.user));
}
async function listar(request, reply) {
  return reply.send(await svc.obtenerLista(request.server, request.query, request.user));
}
async function obtenerPorId(request, reply) {
  return reply.send(await svc.obtenerPorId(request.server, Number(request.params.id), request.user));
}
async function editar(request, reply) {
  return reply.send(await svc.editar(request.server, Number(request.params.id), request.body, request.user));
}
async function eliminar(request, reply) {
  await svc.borrar(request.server, Number(request.params.id), request.user);
  return reply.send({ mensaje: "Cartera eliminada" });
}

module.exports = { crear, listar, obtenerPorId, editar, eliminar };
