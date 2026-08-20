const ctrl    = require("../controllers/inventario.controller");
const schemas = require("../schemas/inventario.schema");
const { consultaBodega, adminOBodega, adminGestion } = require("../middlewares/auth.middleware");

async function inventarioRoutes(app) {
  // Estáticas PRIMERO para que Fastify no las interprete como :id
  app.get("/inventario/resumen-semanal",
    { schema: schemas.resumenSemanal, ...consultaBodega },
    ctrl.resumenSemanal,
  );

  // Lectura — Bodega solo ve información de su sede
  app.get(   "/inventario",     { schema: schemas.listarInventario,   ...consultaBodega }, ctrl.listar);
  app.get(   "/inventario/:id", { schema: schemas.obtenerInventario,  ...consultaBodega }, ctrl.obtenerPorId);

  // Escritura — Admin, AdminBogota y Bodega (Bodega solo su propia sede)
  app.post(  "/inventario",     { schema: schemas.crearInventario,    ...adminOBodega  }, ctrl.crear);
  app.patch( "/inventario/:id", { schema: schemas.editarInventario,   ...adminOBodega  }, ctrl.editar);
  app.delete("/inventario/:id", { schema: schemas.eliminarInventario, ...adminGestion  }, ctrl.eliminar);
}

module.exports = inventarioRoutes;