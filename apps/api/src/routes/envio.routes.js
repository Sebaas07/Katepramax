const ctrl = require("../controllers/envio.controller");
const schemas = require("../schemas/envio.schema");
const { adminOBodega } = require("../middlewares/auth.middleware");

async function envioRoutes(app) {
  // Estáticas PRIMERO para que Fastify no las interprete como :id
  app.get("/envios/pendientes-count",
    { schema: schemas.contarPendientes, ...adminOBodega },
    ctrl.contarPendientes,
  );

  app.post(  "/envios",     { schema: schemas.crearEnvio,     ...adminOBodega }, ctrl.crear);
  app.get(   "/envios",     { schema: schemas.listarEnvios,   ...adminOBodega }, ctrl.listar);
  app.get(   "/envios/:id", { schema: schemas.obtenerEnvio,   ...adminOBodega }, ctrl.obtenerPorId);
  app.patch( "/envios/:id/confirmar", { schema: schemas.confirmarEnvio, ...adminOBodega }, ctrl.confirmar);
}

module.exports = envioRoutes;
