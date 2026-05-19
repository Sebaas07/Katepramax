const svc = require("../services/producto.service");

/**
 * producto.controller.js
 * Delega en el servicio; sólo traduce request/reply.
 */

async function crear(request, reply) {
  const producto = await svc.crear(request.server, request.body);
  return reply.code(201).send(producto);
}

async function listar(request, reply) {
  const lista = await svc.obtenerLista(request.server, request.query);
  return reply.send(lista);
}

async function obtenerPorCodigo(request, reply) {
  const producto = await svc.obtenerPorCodigo(request.server, request.params.codigo);
  return reply.send(producto);
}

async function editar(request, reply) {
  const actualizado = await svc.editar(request.server, request.params.codigo, request.body);
  return reply.send(actualizado);
}

async function desactivar(request, reply) {
  await svc.desactivar(request.server, request.params.codigo);
  return reply.send({ mensaje: "Producto desactivado correctamente" });
}

module.exports = { crear, listar, obtenerPorCodigo, editar, desactivar };
