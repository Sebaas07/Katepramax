const authService = require("../services/auth.service");

const login = async (request, reply) => {
  const svc = authService(request.server);

  const ip = request.ip;
  const userAgent = request.headers["user-agent"] ?? null;

  const result = await svc.login(
    request.body.usuario,
    request.body.contrasena,
    ip,
    userAgent,
  );

  // Enviar refresh token como HttpOnly cookie para mayor seguridad
  reply.setCookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
    maxAge: 15 * 60, // 15 minutos de inactividad
    path: "/api/v1",
  });

  return reply.code(200).send(result);
};

const refresh = async (request, reply) => {
  const svc = authService(request.server);
  const ip = request.ip;
  const userAgent = request.headers["user-agent"] ?? null;

  // El refresh token puede venir de body (compatibilidad) o cookie
  const refreshToken = request.body.refreshToken || request.cookies.refreshToken;

  const result = await svc.refresh(refreshToken, ip, userAgent);

  // Actualizar cookie HttpOnly con nuevo refresh token
  reply.setCookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Strict",
    maxAge: 15 * 60,
    path: "/api/v1",
  });

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
