const svc = require("../services/inventario.service");

async function crear(request, reply) {
  const registro = await svc.registrar(request.server, request.body, request.user);
  return reply.code(201).send(registro);
}

async function listar(request, reply) {
  const lista = await svc.obtenerLista(request.server, request.query, request.user);
  return reply.send(lista);
}

async function obtenerPorId(request, reply) {
  const registro = await svc.obtenerPorId(request.server, Number(request.params.id), request.user);
  return reply.send(registro);
}

async function editar(request, reply) {
  const actualizado = await svc.editar(request.server, Number(request.params.id), request.body, request.user);
  return reply.send(actualizado);
}

async function eliminar(request, reply) {
  await svc.borrar(request.server, Number(request.params.id), request.user);
  return reply.send({ mensaje: "Registro eliminado correctamente" });
}

async function resumenSemanal(request, reply) {
  const resumen = await svc.resumenSemanal(request.server, Number(request.query.semana), request.user);
  return reply.send(resumen);
}

async function resumenDeudaProveedores(request, reply) {
  const resumen = await svc.resumenDeudaProveedores(request.server, request.query, request.user);
  return reply.send(resumen);
}

module.exports = { crear, listar, obtenerPorId, editar, eliminar, resumenSemanal, resumenDeudaProveedores };
