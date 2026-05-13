const cron = require("node-cron");
const sesionRepository = require("../repositories/sesion.repository");

const initCronJobs = (app) => {
  try {
    const sesRepo = sesionRepository(app.prisma);

    // Programación diaria a las 00:00
    cron.schedule("0 0 * * *", async () => {
      app.log.info("CRON: Iniciando limpieza de sesiones...");
      try {
        const resultado = await sesRepo.limpiarExpiradas();
        app.log.info(`CRON: Éxito. Filas eliminadas: ${resultado.count}`);
      } catch (error) {
        // Error durante la ejecución (ej. fallo de conexión a BD)
        app.log.error("CRON: Error durante la ejecución de limpieza:", error);
      }
    });

    app.log.info("Sistema de Cron Jobs cargado exitosamente.");
  } catch (err) {
    // Error durante la configuración (ej. error de sintaxis en el cron)
    app.log.error(
      "CRON: Error crítico al inicializar el sistema de tareas:",
      err,
    );
  }
};

module.exports = { initCronJobs };
