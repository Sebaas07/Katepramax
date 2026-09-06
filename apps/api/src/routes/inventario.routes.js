const ctrl    = require("../controllers/inventario.controller");
const schemas = require("../schemas/inventario.schema");
const { consultaBodega, adminGestion, adminGestionBodega } = require("../middlewares/auth.middleware");

async function inventarioRoutes(app) {
  // Estáticas PRIMERO para que Fastify no las interprete como :id
  app.get("/inventario/resumen-semanal",
    { schema: schemas.resumenSemanal, ...consultaBodega },
    ctrl.resumenSemanal,
  );
  app.get("/inventario/deuda-proveedores",
    { schema: schemas.resumenDeudaProveedores, ...consultaBodega },
    ctrl.resumenDeudaProveedores,
  );
  app.get("/inventario/historial-proveedor/:proveedorId",
    { schema: schemas.historialProveedor, ...consultaBodega },
    ctrl.historialProveedor,
  );

  // Lectura — Bodega solo ve información de su sede
  app.get(   "/inventario",     { schema: schemas.listarInventario,   ...consultaBodega    }, ctrl.listar);
  app.get(   "/inventario/:id", { schema: schemas.obtenerInventario,  ...consultaBodega    }, ctrl.obtenerPorId);

  // Escritura — Admin, AdminBogota y Bodega (Bodega solo su propia sede; Oficinista solo lee)
  app.post(  "/inventario",     { schema: schemas.crearInventario,    ...adminGestionBodega}, ctrl.crear);
  app.patch( "/inventario/:id", { schema: schemas.editarInventario,   ...adminGestionBodega}, ctrl.editar);
  app.delete("/inventario/:id", { schema: schemas.eliminarInventario, ...adminGestion       }, ctrl.eliminar);
}

module.exports = inventarioRoutes;