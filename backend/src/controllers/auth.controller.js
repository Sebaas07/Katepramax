const bcrypt = require("bcrypt");
const { registrarAccion } = require("../utils/logger");

const login = async (request, reply) => {
  const { usuario, contrasena } = request.body;
  const app = request.server;

  try {
    const user = await app.prisma.usuario.findUnique({
      where: { usuario },
    });

    if (!user || !user.activo) {
      return reply
        .code(401)
        .send({ error: "Usuario no encontrado o inactivo" });
    }

    const isValid = await bcrypt.compare(contrasena, user.clave);
    if (!isValid) {
      return reply.code(401).send({ error: "Contraseña incorrecta" });
    }

    const token = app.jwt.sign(
      {
        id: user.id,
        usuario: user.usuario,
        rol: user.rol,
        sedeId: user.sedeId,
      },
      { expiresIn: "1d" },
    );

    // Actualizar ultimoAcceso
    await app.prisma.usuario.update({
      where: { id: user.id },
      data: { ultimoAcceso: new Date() },
    });

    await registrarAccion(app, user.id, "LOGIN", `El usuario ${user.usuario} inició sesión`);

    return {
      message: "Inicio de sesión exitoso",
      token,
      user: {
        id: user.id,
        nombreCompleto: user.nombreCompleto, 
        usuario: user.usuario,
        rol: user.rol,
        sedeId: user.sedeId,
      },
    };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Error interno en el servidor" });
  }
};

module.exports = { login };
