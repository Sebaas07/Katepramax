const usuarioService = require("../services/usuario.service");

const getAll      = async (req, reply) => reply.send(await usuarioService(req.server).getAll());
const getById     = async (req, reply) => reply.send(await usuarioService(req.server).getById(parseInt(req.params.id)));
const getEntregadores = async (req, reply) => reply.send(await usuarioService(req.server).getEntregadores(req.user));
const create      = async (req, reply) => reply.code(201).send(await usuarioService(req.server).create(req.body, req.user.id));
const update      = async (req, reply) => reply.send(await usuarioService(req.server).update(parseInt(req.params.id), req.body, req.user.id));
const desactivar  = async (req, reply) => reply.send(await usuarioService(req.server).setActivo(parseInt(req.params.id), false, req.user.id));
const activar     = async (req, reply) => reply.send(await usuarioService(req.server).setActivo(parseInt(req.params.id), true, req.user.id));

module.exports = { getAll, getById, getEntregadores, create, update, desactivar, activar };
