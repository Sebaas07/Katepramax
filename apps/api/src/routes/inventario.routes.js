const ctrl    = require("../controllers/inventario.controller");
const schemas = require("../schemas/inventario.schema");
const { consultaBodega, adminGestion, soloAdmin } = require("../middlewares/auth.middleware");

async function inventarioRoutes(app) {
  // Estáticas PRIMERO para que Fastify no las interprete como :id
  app.get("/inventario/resumen-semanal",
    { schema: schemas.resumenSemanal, ...consultaBodega },
    ctrl.resumenSemanal,
  );

  // Lectura — Bodega solo ve información de su sede
  app.get(   "/inventario",     { schema: schemas.listarInventario,   ...consultaBodega }, ctrl.listar);
  app.get(   "/inventario/:id", { schema: schemas.obtenerInventario,  ...consultaBodega }, ctrl.obtenerPorId);

  // Escritura — solo Admin / AdminBogota
  app.post(  "/inventario",     { schema: schemas.crearInventario,    ...adminGestion  }, ctrl.crear);
  app.patch( "/inventario/:id", { schema: schemas.editarInventario,   ...adminGestion  }, ctrl.editar);
  app.delete("/inventario/:id", { schema: schemas.eliminarInventario, ...soloAdmin     }, ctrl.eliminar);
}

module.exports = inventarioRoutes;