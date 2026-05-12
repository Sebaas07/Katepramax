const authService = require("../services/auth.service");

const login = async (request, reply) => {
  const svc = authService(request.server);
  const result = await svc.login(request.body.usuario, request.body.contrasena);
  return reply.code(200).send(result);
};

const me = async (request, reply) => {
  const svc = authService(request.server);
  const user = await svc.me(request.user.id);
  return reply.code(200).send(user);
};

const cambiarClave = async (request, reply) => {
  const svc = authService(request.server);
  await svc.cambiarClave(request.user.id, request.body.claveActual, request.body.claveNueva);
  return reply.code(200).send({ message: "Contraseña actualizada exitosamente" });
};

module.exports = { login, me, cambiarClave };
