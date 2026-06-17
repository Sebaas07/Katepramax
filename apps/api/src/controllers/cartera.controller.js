const svc = require("../services/cartera.service");

async function crear(req, reply)        { return reply.code(201).send(await svc.registrar(req.server, req.body)); }
async function listar(req, reply)       { return reply.send(await svc.obtenerLista(req.server, req.query)); }
async function obtenerPorId(req, reply) { return reply.send(await svc.obtenerPorId(req.server, Number(req.params.id))); }
async function editar(req, reply)       { return reply.send(await svc.editar(req.server, Number(req.params.id), req.body)); }
async function eliminar(req, reply)     { await svc.borrar(req.server, Number(req.params.id)); return reply.send({ mensaje: "Cartera eliminada" }); }

module.exports = { crear, listar, obtenerPorId, editar, eliminar };
