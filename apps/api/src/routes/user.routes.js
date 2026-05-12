const {
  getAll,
  getById,
  create,
  update,
  desactivar,
  activar,
} = require("../controllers/user.controller");
const { soloAdmin } = require("../middlewares/auth.middleware");
const {
  createUsuarioBody,
  updateUsuarioBody,
  usuarioResponse,
  idParam,
} = require("../schemas/usuario.schema");

async function userRoutes(app) {
  // GET /api/usuarios
  app.get("/usuarios", {
    schema: {
      summary: "Listar todos los usuarios",
      tags: ["Usuarios"],
      response: { 200: { type: "array", items: usuarioResponse } },
    },
    preHandler: soloAdmin,
    handler: getAll,
  });

  // GET /api/usuarios/:id
  app.get("/usuarios/:id", {
    schema: {
      summary: "Obtener usuario por ID",
      tags: ["Usuarios"],
      params: idParam,
      response: { 200: usuarioResponse },
    },
    preHandler: soloAdmin,
    handler: getById,
  });

  // POST /api/usuarios
  app.post("/usuarios", {
    schema: {
      summary: "Crear usuario",
      tags: ["Usuarios"],
      body: createUsuarioBody,
    },
    preHandler: soloAdmin,
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
    preHandler: soloAdmin,
    handler: update,
  });

  // PATCH /api/usuarios/:id — desactivar
  app.patch("/usuarios/:id", {
    schema: {
      summary: "Desactivar usuario",
      tags: ["Usuarios"],
      params: idParam,
    },
    preHandler: soloAdmin,
    handler: desactivar,
  });

  // PATCH /api/usuarios/:id/activar
  app.patch("/usuarios/:id/activar", {
    schema: {
      summary: "Activar usuario",
      tags: ["Usuarios"],
      params: idParam,
    },
    preHandler: soloAdmin,
    handler: activar,
  });
}

module.exports = userRoutes;
