/**
 * Schemas de validación para las rutas de autenticación.
 * Fastify los usa para validar el body automáticamente antes
 * de que lleguen al controller — responde 400 si algo falla.
 */

const loginBody = {
  type: "object",
  required: ["usuario", "contrasena"],
  additionalProperties: false,
  properties: {
    usuario: {
      type: "string",
      minLength: 5,
      maxLength: 10,
      description: "Nombre de usuario",
    },
    contrasena: {
      type: "string",
      minLength: 6,
      maxLength: 25,
      description: "Contraseña del usuario",
    },
  },
};

const cambiarClaveBody = {
  type: "object",
  required: ["claveActual", "claveNueva"],
  additionalProperties: false,
  properties: {
    claveActual: {
      type: "string",
      minLength: 6,
      maxLength: 25,
      description: "Contraseña actual",
    },
    claveNueva: {
      type: "string",
      minLength: 6,
      maxLength: 25,
      description: "Nueva contraseña",
    },
  },
};

// Respuestas — sirven para Swagger y para que Fastify serialice más rápido
const loginResponse = {
  200: {
    type: "object",
    properties: {
      token: { type: "string" },
      user: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nombreCompleto: { type: "string" },
          usuario: { type: "string" },
          rol: { type: "string", enum: ["Admin", "Bodega", "Entregador"] },
          sedeId: { type: "integer" },
          sede: { type: "string", nullable: true },
        },
      },
    },
  },
};

module.exports = { loginBody, cambiarClaveBody, loginResponse };
