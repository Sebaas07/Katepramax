const ctrl    = require("../controllers/cliente.controller");
const schemas = require("../schemas/cliente.schema");
const { adminGestion, soloAdmin } = require("../middlewares/auth.middleware");

async function clienteRoutes(app) {
  // Solo Admin y AdminBogota gestionan clientes (Bodega es solo lectura de inventario/entregas/reportes)
  app.get("/clientes",     { schema: schemas.listarClientes,  ...adminGestion }, ctrl.listar);
  app.get("/clientes/:id", { schema: schemas.obtenerCliente,  ...adminGestion }, ctrl.obtenerPorId);

  app.post("/clientes",         { schema: schemas.crearCliente,    ...adminGestion }, ctrl.crear);
  app.patch("/clientes/:id",    { schema: schemas.editarCliente,   ...adminGestion }, ctrl.actualizar);

  // Desactivar: solo Admin
  app.delete("/clientes/:id",   { schema: schemas.desactivarCliente, ...soloAdmin  }, ctrl.desactivar);

  // Abonar a deuda: Admin y AdminBogota
  app.post("/clientes/:id/abonar", { schema: schemas.abonarCliente, ...adminGestion }, ctrl.abonar);
}

module.exports = clienteRoutes;