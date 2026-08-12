const {
  getAll,
  getById,
  getEntregadores,
  create,
  update,
  desactivar,
  activar,
} = require("../controllers/user.controller");
const { soloAdmin, gestion } = require("../middlewares/auth.middleware");
const {
  createUsuarioBody,
  updateUsuarioBody,
  usuarioResponse,
  idParam,
} = require("../schemas/usuario.schema");

async function userRoutes(app) {
  const preValidation = soloAdmin.preValidation;

  // GET /api/usuarios
  app.get("/usuarios", {
    schema: {
      summary: "Listar todos los usuarios",
      tags: ["Usuarios"],
      response: { 200: { type: "array", items: usuarioResponse } },
    },
    preValidation,
    handler: getAll,
  });

  // GET /api/usuarios/entregadores — Admin, AdminBogota y Oficinista
  // (lista de entregadores activos para asignar pedidos). DEBE ir antes
  // de /:id para que Fastify lo matchee como ruta estática.
  app.get("/usuarios/entregadores", {
    schema: {
      summary: "Listar entregadores activos",
      tags: ["Usuarios"],
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
              nombreCompleto: { type: "string" },
              telefono: { type: "string" },
            },
          },
        },
      },
    },
    preValidation: gestion.preValidation,
    handler: getEntregadores,
  });

  // GET /api/usuarios/:id
  app.get("/usuarios/:id", {
    schema: {
      summary: "Obtener usuario por ID",
      tags: ["Usuarios"],
      params: idParam,
      response: { 200: usuarioResponse },
    },
    preValidation,
    handler: getById,
  });

  // POST /api/usuarios
  app.post("/usuarios", {
    schema: {
      summary: "Crear usuario",
      tags: ["Usuarios"],
      body: createUsuarioBody,
    },
    preValidation,
    handler: create,
  });

  // PUT /api/usuarios/:id
  app.put("/usuarios/:id", {
    schema: {
      summary: "Actualizar usuario",
      tags: ["Usuarios"],
      params: idParam,
      body: updateUsuarioBody,
    },
    preValidation,
    handler: update,
  });

  // PATCH /api/usuarios/:id/activar  ← DEBE ir ANTES de /:id
  app.patch("/usuarios/:id/activar", {
    schema: {
      summary: "Activar usuario",
      tags: ["Usuarios"],
      params: idParam,
    },
    preValidation,
    handler: activar,
  });

  // PATCH /api/usuarios/:id — desactivar
  app.patch("/usuarios/:id", {
    schema: {
      summary: "Desactivar usuario",
      tags: ["Usuarios"],
      params: idParam,
    },
    preValidation,
    handler: desactivar,
  });
}

module.exports = userRoutes;
