const ctrl = require("../controllers/envio.controller");
const schemas = require("../schemas/envio.schema");
const { adminGestionBodega, adminOBodega } = require("../middlewares/auth.middleware");

async function envioRoutes(app) {
  // Estáticas PRIMERO para que Fastify no las interprete como :id
  app.get("/envios/pendientes-count",
    { schema: schemas.contarPendientes, ...adminOBodega },
    ctrl.contarPendientes,
  );

  // Crear guía de envío — Admin / AdminBogota / Bodega (la sede que despacha)
  app.post(  "/envios",     { schema: schemas.crearEnvio,     ...adminGestionBodega }, ctrl.crear);

  // Consultar y confirmar recepción — Admin, AdminBogota y Bodega (Bodega solo su sede,
  // filtro aplicado en envio.service.js)
  app.get(   "/envios",     { schema: schemas.listarEnvios,   ...adminOBodega }, ctrl.listar);
  app.get(   "/envios/:id", { schema: schemas.obtenerEnvio,   ...adminOBodega }, ctrl.obtenerPorId);
  app.patch( "/envios/:id/confirmar", { schema: schemas.confirmarEnvio, ...adminOBodega }, ctrl.confirmar);
  app.patch( "/envios/:id/cancelar",  { schema: schemas.cancelarEnvio,  ...adminOBodega }, ctrl.cancelar);
}

module.exports = envioRoutes;