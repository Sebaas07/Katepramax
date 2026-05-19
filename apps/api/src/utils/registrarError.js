const registrarError = async (app, error, request) => {
  try {
    await app.prisma.errorLog.create({
      data: {
        mensaje: error.message,
        stack: error.stack, // El rastro del código donde falló
        metodo: request?.method,
        url: request?.url,
        usuarioId: request?.user?.id || null, // Si el usuario estaba logueado
      },
    });
  } catch (dbErr) {
    // Si falla la DB, usamos el logger de Fastify para no perder el rastro
    app.log.error("Fallo crítico: No se pudo guardar el ErrorLog en DB", dbErr);
  }
};

module.exports = { registrarError };
