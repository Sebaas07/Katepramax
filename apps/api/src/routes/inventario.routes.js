

const ctrl    = require("../controllers/inventario.controller");
const schemas = require("../schemas/inventario.schema");
const { adminOBodega, soloAdmin } = require("../middlewares/auth.middleware");

async function inventarioRoutes(app) {
  // Estáticas PRIMERO para que Fastify no las interprete como :id
  app.get("/inventario/resumen-semanal",
    { schema: schemas.resumenSemanal, ...adminOBodega },
    ctrl.resumenSemanal,
  );

  app.post(  "/inventario",     { schema: schemas.crearInventario,    ...adminOBodega }, ctrl.crear);
  app.get(   "/inventario",     { schema: schemas.listarInventario,   ...adminOBodega }, ctrl.listar);
  app.get(   "/inventario/:id", { schema: schemas.obtenerInventario,  ...adminOBodega }, ctrl.obtenerPorId);
  app.patch( "/inventario/:id", { schema: schemas.editarInventario,   ...adminOBodega }, ctrl.editar);
  app.delete("/inventario/:id", { schema: schemas.eliminarInventario, ...soloAdmin    }, ctrl.eliminar);
}

module.exports = inventarioRoutes;
