const ctrl    = require("../controllers/cliente.controller");
const schemas = require("../schemas/cliente.schema");
const { adminOBodega, adminGestion } = require("../middlewares/auth.middleware");

async function clienteRoutes(app) {
  // Admin, AdminBogota y Bodega (Bodega solo su propia sede — filtro en cliente.service.js)
  app.get("/clientes",     { schema: schemas.listarClientes,  ...adminOBodega }, ctrl.listar);
  app.get("/clientes/:id", { schema: schemas.obtenerCliente,  ...adminOBodega }, ctrl.obtenerPorId);

  app.post("/clientes",         { schema: schemas.crearCliente,    ...adminOBodega }, ctrl.crear);
  app.patch("/clientes/:id",    { schema: schemas.editarCliente,   ...adminOBodega }, ctrl.actualizar);

  // Desactivar: Admin y AdminBogota
  app.delete("/clientes/:id",   { schema: schemas.desactivarCliente, ...adminGestion  }, ctrl.desactivar);

  // Abonar a deuda: Admin, AdminBogota y Bodega
  app.post("/clientes/:id/abonar", { schema: schemas.abonarCliente, ...adminOBodega }, ctrl.abonar);
}

module.exports = clienteRoutes;