const ctrl    = require("../controllers/cliente.controller");
const schemas = require("../schemas/cliente.schema");
const { adminOBodega, soloAdmin } = require("../middlewares/auth.middleware");

async function clienteRoutes(app) {
  // Listar y consultar: Bodega y Admin
  app.get("/clientes",     { schema: schemas.listarClientes,  ...adminOBodega }, ctrl.listar);
  app.get("/clientes/:id", { schema: schemas.obtenerCliente,  ...adminOBodega }, ctrl.obtenerPorId);

  // Crear y editar: Bodega y Admin
  app.post("/clientes",         { schema: schemas.crearCliente,    ...adminOBodega }, ctrl.crear);
  app.patch("/clientes/:id",    { schema: schemas.editarCliente,   ...adminOBodega }, ctrl.actualizar);

  // Desactivar: solo Admin
  app.delete("/clientes/:id",   { schema: schemas.desactivarCliente, ...soloAdmin  }, ctrl.desactivar);
}

module.exports = clienteRoutes;
