// src/routes/user.routes.js
const { authenticate, requireRole } = require('../middlewares/auth.middleware');
const userController = require('../controllers/user.controller');

async function userRoutes(app, options) {
  // Crear usuario (Solo permitido para administradores)
  app.post(
    '/api/usuarios',
    {
      preHandler: [authenticate, requireRole(['Admin'])]
    },
    userController.createUser
  );

  // Obtener lista de usuarios 
  app.get(
    '/api/usuarios',
    {
      preHandler: [authenticate, requireRole(['Admin', 'Bodega'])]
    },
    userController.getUsers
  );
}

module.exports = userRoutes;