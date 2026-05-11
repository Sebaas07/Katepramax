const bcrypt = require("bcrypt");
const { registrarAccion } = require("../utils/logger"); 

const createUser = async (request, reply) => {
  
  const { nombreCompleto, usuario, correo, contrasena, rol, telefono, sedeId } =
    request.body;
  const app = request.server;

  try {
    const existingUser = await app.prisma.usuario.findUnique({
      where: { usuario },
    });

    if (existingUser) {
      return reply
        .code(400)
        .send({ error: "El nombre de usuario ya está en uso" });
    }

    const existingEmail = await app.prisma.usuario.findUnique({
      where: { correo },
    });

    if (existingEmail) {
      return reply.code(400).send({ error: "El correo ya está registrado" });
    }

    const hashedPassword = await bcrypt.hash(contrasena, 10);

    const newUser = await app.prisma.usuario.create({
      data: {
        nombreCompleto, 
        usuario,
        correo,
        clave: hashedPassword,
        rol,
        telefono,
        sedeId: parseInt(sedeId), 
      },
    });

    const quienCreaId = request.user.id;
    await registrarAccion(
      app,
      quienCreaId,
      "CREAR_USUARIO",
      `Se creó al usuario: ${newUser.usuario}`,
    );

    return reply.code(201).send({
      message: "Usuario creado exitosamente",
      user: {
        id: newUser.id,
        nombreCompleto: newUser.nombreCompleto, 
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
        sede: {
          select: { nombre: true },
        },
        activo: true,
        telefono: true,
        creadoEn: true,
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
    nombreCompleto, 
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
      nombreCompleto,
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

    const quienActualizaId = request.user.id;
    await registrarAccion(
      app,
      quienActualizaId,
      "ACTUALIZAR_USUARIO",
      `Se actualizó al usuario: ${updatedUser.usuario}`,
    );

    return reply.code(200).send({
      message: "Usuario actualizado exitosamente",
      user: {
        id: updatedUser.id,
        nombreCompleto: updatedUser.nombreCompleto, 
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

    const quienActivaId = request.user.id;
    await registrarAccion(
      app,
      quienActivaId,
      "ACTIVAR_USUARIO",
      `Se activó al usuario: ${updatedUser.usuario}`,
    );

    return reply.code(200).send({
      message: "Usuario activado exitosamente",
      user: {
        id: updatedUser.id,
        nombreCompleto: updatedUser.nombreCompleto, 
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

    const quienInactivaId = request.user.id;
    await registrarAccion(
      app,
      quienInactivaId,
      "INACTIVAR_USUARIO",
      `Se inactivó al usuario: ${updatedUser.usuario}`,
    );

    return reply.code(200).send({
      message: "Usuario inactivado exitosamente",
      user: {
        id: updatedUser.id,
        nombreCompleto: updatedUser.nombreCompleto, 
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
