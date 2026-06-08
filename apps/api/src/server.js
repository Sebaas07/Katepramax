const { buildApp } = require("./app");
const { initCronJobs } = require("./tasks/cron");
require("dotenv").config();

const start = async () => {
  try {
    const app = await buildApp();

    // Esperamos a que todos los plugins carguen antes de escuchar el puerto
    await app.ready();

    const port = parseInt(process.env.PORT) || 3000;
    await app.listen({ port, host: "0.0.0.0" });

    // Inicializamos las tareas automáticas
    initCronJobs(app);

    console.log(`Servidor escuchando en el puerto ${port}`);
  } catch (err) {
    console.error("DETALLE DEL ERROR CRÍTICO EN EL ARRANQUE:", err);
    process.exit(1);
  }
};

start();
