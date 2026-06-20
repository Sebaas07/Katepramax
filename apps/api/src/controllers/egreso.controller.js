const svc = require("../services/egreso.service");

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
  return reply.send({ mensaje: "Egreso eliminado" });
}
async function resumenSemanal(request, reply) {
  return reply.send(await svc.resumenPorSede(request.server, Number(request.query.semana), request.user));
}
async function resumenConcepto(request, reply) {
  return reply.send(await svc.resumenPorConcepto(request.server, Number(request.query.semana), request.user));
}
async function totalesDia(request, reply) {
  return reply.send(await svc.totalesPorDia(request.server, Number(request.query.semana), request.user));
}

module.exports = { crear, listar, obtenerPorId, editar, eliminar, resumenSemanal, resumenConcepto, totalesDia };
