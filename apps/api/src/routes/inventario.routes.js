const ctrl = require("../controllers/inventario.controller");
const schemas = require("../schemas/inventario.schema");
const { verifyToken } = require("../middlewares/auth.middleware");

async function inventarioRoutes(app) {
  app.addHook("preHandler", verifyToken); 

  app.get(
    "/inventario/resumen-semanal",
    { schema: schemas.resumenSemanal },
    ctrl.resumenSemanal,
  );
  app.post("/inventario", { schema: schemas.crearInventario }, ctrl.crear);
  app.get("/inventario", { schema: schemas.listarInventario }, ctrl.listar);
  app.get(
    "/inventario/:id",
    { schema: schemas.obtenerInventario },
    ctrl.obtenerPorId,
  );
  app.patch(
    "/inventario/:id",
    { schema: schemas.editarInventario },
    ctrl.editar,
  );
  app.delete(
    "/inventario/:id",
    { schema: schemas.eliminarInventario },
    ctrl.eliminar,
  );
}

module.exports = inventarioRoutes;
