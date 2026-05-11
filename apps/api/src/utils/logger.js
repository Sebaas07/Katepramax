const registrarAccion = async (app, usuarioId, accion, descripcion) => {
  try {
    await app.prisma.log.create({
      data: {
        accion,
        descripcion,
        usuarioId,
      },
    });
  } catch (error) {
    console.error("Error guardando el log:", error);
  }
};

module.exports = { registrarAccion };
