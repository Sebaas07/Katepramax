const bcrypt = require("bcrypt");

const createUser = async (request, reply) => {
  const { nombre_completo, usuario, correo, contrasena, rol, telefono } =
    request.body;
  const app = request.server;

  try {
    // 1. Validar si el usuario ya existe
    const existingUser = await app.prisma.usuario.findUnique({
      where: { usuario },
    });

    if (existingUser) {
      return reply
        .code(400)
        .send({ error: "El nombre de usuario ya está en uso" });
    }

    // 2. Validar si el correo ya existe
    const existingEmail = await app.prisma.usuario.findUnique({
      where: { correo },
    });

    if (existingEmail) {
      return reply.code(400).send({ error: "El correo ya está registrado" });
    }

    // 3. Hashear la contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // 4. Crear el nuevo usuario
    const newUser = await app.prisma.usuario.create({
      data: {
        nombreCompleto,
        usuario,
        correo,
        clave: hashedPassword,
        rol, // "Admin", "Bodega" o "Entregador"
        telefono,
        sedeId: parseInt(sedeId),
      },
    });

    return reply.code(201).send({
      message: "Usuario creado exitosamente",
      user: {
        id: newUser.id,
        nombre_completo: newUser.nombreCompleto,
        usuario: newUser.usuario,
        rol: newUser.rol,
        sedeId: newUser.sedeId,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Error al crear el usuario" });
  }
};

const getUsers = async (request, reply) => {
  const app = request.server;
  try {
    const users = await app.prisma.usuario.findMany({
      select: {
        id: true,
        nombreCompleto: true,
        usuario: true,
        correo: true,
        rol: true,
        sede: { // Traemos datos de la tabla relacionada [cite: 2]
          select: { nombre: true }
        },
        activo: true,
        telefono: true,
        creado_en: true, // Actualizado según tu modelo actual
      },
    });
    return users;
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Error al obtener usuarios" });
  }
};

const updateUser = async (request, reply) => {
  const { id } = request.params;
  const {
    nombre_completo,
    usuario,
    correo,
    contrasena,
    rol,
    telefono,
    activo,
  } = request.body;
  const app = request.server;

  try {
    const existingUser = await app.prisma.usuario.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingUser) {
      return reply.code(404).send({ error: "Usuario no encontrado" });
    }

    const dataToUpdate = {
      nombre_completo,
      usuario,
      correo,
      telefono,
      rol,
      activo,
    };

    if (contrasena) {
      dataToUpdate.clave = await bcrypt.hash(contrasena, 10);
    }

    const updatedUser = await app.prisma.usuario.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });

    return reply.code(200).send({
      message: "Usuario actualizado exitosamente",
      user: {
        id: updatedUser.id,
        nombre_completo: updatedUser.nombre_completo,
        usuario: updatedUser.usuario,
        rol: updatedUser.rol,
        activo: updatedUser.activo,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Error al actualizar el usuario" });
  }
};

const activateUser = async (request, reply) => {
  const { id } = request.params;
  const app = request.server;

  try {
    const updatedUser = await app.prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { activo: true },
    });
    return reply.code(200).send({
      message: "Usuario activado exitosamente",
      user: {
        id: updatedUser.id,
        nombre_completo: updatedUser.nombre_completo,
        activo: updatedUser.activo,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Error al activar el usuario" });
  }
};

const inactivateUser = async (request, reply) => {
  const { id } = request.params;
  const app = request.server;

  try {
    const updatedUser = await app.prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { activo: false },
    });
    return reply.code(200).send({
      message: "Usuario inactivado exitosamente",
      user: {
        id: updatedUser.id,
        nombre_completo: updatedUser.nombre_completo,
        activo: updatedUser.activo,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: "Error al inactivar el usuario" });
  }
};

module.exports = {
  createUser,
  getUsers,
  updateUser,
  activateUser,
  inactivateUser,
};
