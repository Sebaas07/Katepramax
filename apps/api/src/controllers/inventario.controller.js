const svc = require("../services/inventario.service");

/**
 * inventario.controller.js
 * Delega en el servicio; sólo traduce request/reply.
 */

async function crear(request, reply) {
  const registro = await svc.registrar(request.server, request.body);
  return reply.code(201).send(registro);
}

async function listar(request, reply) {
  const lista = await svc.obtenerLista(request.server, request.query);
  return reply.send(lista);
}

async function obtenerPorId(request, reply) {
  const registro = await svc.obtenerPorId(request.server, Number(request.params.id));
  return reply.send(registro);
}

async function editar(request, reply) {
  const actualizado = await svc.editar(request.server, Number(request.params.id), request.body);
  return reply.send(actualizado);
}

async function eliminar(request, reply) {
  await svc.borrar(request.server, Number(request.params.id));
  return reply.send({ mensaje: "Registro eliminado correctamente" });
}

async function resumenSemanal(request, reply) {
  const resumen = await svc.resumenSemanal(request.server, Number(request.query.semana));
  return reply.send(resumen);
}

module.exports = { crear, listar, obtenerPorId, editar, eliminar, resumenSemanal };
