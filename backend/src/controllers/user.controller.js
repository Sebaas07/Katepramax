const bcrypt = require('bcrypt');

const createUser = async (request, reply) => {
  const { nombre_completo, usuario, correo, contrasena, rol, telefono } = request.body;
  const app = request.server;

  try {
    // 1. Validar si el usuario ya existe
    const existingUser = await app.prisma.usuario.findUnique({
      where: { usuario }
    });

    if (existingUser) {
      return reply.code(400).send({ error: 'El nombre de usuario ya está en uso' });
    }

    // 2. Validar si el correo ya existe
    const existingEmail = await app.prisma.usuario.findUnique({
      where: { correo }
    });

    if (existingEmail) {
      return reply.code(400).send({ error: 'El correo ya está registrado' });
    }

    // 3. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // 4. Crear el nuevo usuario
    const newUser = await app.prisma.usuario.create({
      data: {
        nombre_completo,
        usuario,
        correo,
        clave: hashedPassword,
        rol, // "Admin", "Bodega" o "Entregador"
        telefono
      }
    });

    return reply.code(201).send({
      message: 'Usuario creado exitosamente',
      user: {
        id: newUser.id,
        nombre_completo: newUser.nombre_completo,
        usuario: newUser.usuario,
        rol: newUser.rol
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: 'Error al crear el usuario' });
  }
};

const getUsers = async (request, reply) => {
  const app = request.server;
  try {
    const users = await app.prisma.usuario.findMany({
      select: {
        id: true,
        nombre_completo: true,
        usuario: true,
        correo: true,
        rol: true,
        activo: true,
        telefono: true,
        creado_en: true,
        ultimo_acceso: true
      }
    });
    return users;
  } catch (error) {
    // Registra el error en la consola para saber qué falló
    request.log.error(error); 
    return reply.code(500).send({ error: 'Error al obtener usuarios' });
  }
};

module.exports = {
  createUser,
  getUsers
};