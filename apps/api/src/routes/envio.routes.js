const ctrl = require("../controllers/envio.controller");
const schemas = require("../schemas/envio.schema");
const { adminGestion } = require("../middlewares/auth.middleware");

async function envioRoutes(app) {
  // Estáticas PRIMERO para que Fastify no las interprete como :id
  app.get("/envios/pendientes-count",
    { schema: schemas.contarPendientes, ...adminGestion },
    ctrl.contarPendientes,
  );

  app.post(  "/envios",     { schema: schemas.crearEnvio,     ...adminGestion }, ctrl.crear);
  app.get(   "/envios",     { schema: schemas.listarEnvios,   ...adminGestion }, ctrl.listar);
  app.get(   "/envios/:id", { schema: schemas.obtenerEnvio,   ...adminGestion }, ctrl.obtenerPorId);
  app.patch( "/envios/:id/confirmar", { schema: schemas.confirmarEnvio, ...adminGestion }, ctrl.confirmar);
}

module.exports = envioRoutes;