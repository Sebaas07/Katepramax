const authService = require("../services/auth.service");

const login = async (request, reply) => {
  const svc = authService(request.server);
  
  // Obtener la IP del cliente y el User-Agent para mejorar la seguridad y el monitoreo
  const ip = request.ip;
  const userAgent = request.headers["user-agent"] ?? null;

  const result = await svc.login(
    request.body.usuario,
    request.body.contrasena,
    ip,
    userAgent,
  );

  return reply.code(200).send(result);
};

const refresh = async (request, reply) => {
  const svc = authService(request.server);
  const ip = request.ip;
  const userAgent = request.headers["user-agent"] ?? null;

  const result = await svc.refresh(request.body.refreshToken, ip, userAgent);
  return reply.code(200).send(result);
};

const logout = async (request, reply) => {
  const svc = authService(request.server);
  await svc.logout(request.user.sesionId);
  return reply.code(200).send({ message: "Sesión cerrada correctamente." });
};

const me = async (request, reply) => {
  const svc = authService(request.server);
  const user = await svc.me(request.user.id);
  return reply.code(200).send(user);
};

const cambiarClave = async (request, reply) => {
  const svc = authService(request.server);
  await svc.cambiarClave(
    request.user.id,
    request.body.claveActual,
    request.body.claveNueva,
  );
  return reply.code(200).send({
    message: "Contraseña actualizada. Por seguridad, vuelve a iniciar sesión.",
  });
};

module.exports = { login, refresh, logout, me, cambiarClave };
