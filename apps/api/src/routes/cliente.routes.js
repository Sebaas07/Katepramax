const ctrl    = require("../controllers/cliente.controller");
const schemas = require("../schemas/cliente.schema");
const { adminOBodega, adminGestion, carteraClientesAbono } = require("../middlewares/auth.middleware");

async function clienteRoutes(app) {
  // Listar / ver: oficina + Bodega + Admin; Entregador solo vía carteraClientesAbono (misma ruta, rol permitido)
  app.get("/clientes",     { schema: schemas.listarClientes,  ...carteraClientesAbono }, ctrl.listar);
  app.get("/clientes/:id", { schema: schemas.obtenerCliente,  ...carteraClientesAbono }, ctrl.obtenerPorId);

  // Alta/edición: sin Entregador
  app.post("/clientes",         { schema: schemas.crearCliente,    ...adminOBodega }, ctrl.crear);
  app.patch("/clientes/:id",    { schema: schemas.editarCliente,   ...adminOBodega }, ctrl.actualizar);

  app.delete("/clientes/:id",   { schema: schemas.desactivarCliente, ...adminGestion  }, ctrl.desactivar);

  // Abonar: incluye Entregador (cobro en ruta sin pedido)
  app.post("/clientes/:id/abonar", { schema: schemas.abonarCliente, ...carteraClientesAbono }, ctrl.abonar);
}

module.exports = clienteRoutes;
