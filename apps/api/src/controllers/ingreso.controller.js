
const svc = require("../services/ingreso.service");

async function crear(req, reply)          { return reply.code(201).send(await svc.registrar(req.server, req.body)); }
async function listar(req, reply)         { return reply.send(await svc.obtenerLista(req.server, req.query)); }
async function obtenerPorId(req, reply)   { return reply.send(await svc.obtenerPorId(req.server, Number(req.params.id))); }
async function editar(req, reply)         { return reply.send(await svc.editar(req.server, Number(req.params.id), req.body)); }
async function eliminar(req, reply)       { await svc.borrar(req.server, Number(req.params.id)); return reply.send({ mensaje: "Ingreso eliminado" }); }
async function resumenSemanal(req, reply) { return reply.send(await svc.resumenPorSede(req.server, Number(req.query.semana))); }
async function totalesDia(req, reply)     { return reply.send(await svc.totalesPorDia(req.server, Number(req.query.semana))); }

module.exports = { crear, listar, obtenerPorId, editar, eliminar, resumenSemanal, totalesDia };
