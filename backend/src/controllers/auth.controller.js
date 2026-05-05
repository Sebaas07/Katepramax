const bcrypt = require('bcrypt');

const login = async (request, reply) => {
  const { usuario, contrasena } = request.body;
  const app = request.server;

  try {
    // 1. Buscar al usuario en la base de datos
    const user = await app.prisma.usuario.findUnique({
      where: { usuario }
    });

    if (!user || !user.activo) {
      return reply.code(401).send({ error: 'Usuario no encontrado o inactivo' });
    }

    // 2. Comparar contraseñas
    const isValid = await bcrypt.compare(contrasena, user.clave);
    if (!isValid) {
      return reply.code(401).send({ error: 'Contraseña incorrecta' });
    }

    // 3. Generar token JWT con la información del usuario
    const token = app.jwt.sign(
      {
        id: user.id,
        usuario: user.usuario,
        rol: user.rol
      },
      { expiresIn: '1d' }
    );

    // 4. Retornar respuesta exitosa
    return {
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        nombre_completo: user.nombre_completo,
        usuario: user.usuario,
        rol: user.rol
      }
    };
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Error interno en el servidor' });
  }
};

module.exports = { login };