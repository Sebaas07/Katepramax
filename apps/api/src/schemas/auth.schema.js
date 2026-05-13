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
    usuario: { type: "string", minLength: 3, maxLength: 50, description: "Nombre de usuario o email" },
    contrasena: { type: "string", minLength: 6, maxLength: 100, description: "Contraseña del usuario" },
  },
};

/** Para renovar el access token usando el refresh token. */
const refreshBody = {
  type: "object",
  required: ["refreshToken"],
  additionalProperties: false,
  properties: {
    refreshToken: { type: "string", minLength: 10, description: "Token de refresco" },
  },
};

/** Para cambiar la contraseña (requiere el access token). */
const cambiarClaveBody = {
  type: "object",
  required: ["claveActual", "claveNueva"],
  additionalProperties: false,
  properties: {
    claveActual: { type: "string", minLength: 6, maxLength: 100, description: "Contraseña actual" },
    claveNueva: { type: "string", minLength: 6, maxLength: 100, description: "Nueva contraseña" },
  },
};

/** Esquema de respuesta para login y refresh: incluye tokens y datos del usuario. */
const tokenPair = {
  type: "object",
  properties: {
    accessToken: { type: "string" },
    refreshToken: { type: "string" },
    user: {
      type: "object",
      properties: {
        id: { type: "integer" },
        nombreCompleto: { type: "string", description: "Nombre completo del usuario" },
        usuario: { type: "string", description: "Nombre de usuario" },
        rol: { type: "string", enum: ["Admin", "Bodega", "Entregador"], description: "Rol del usuario" },
        sedeId: { type: "integer" },
        sede: { type: "string", nullable: false, description: "Nombre de la sede" },
      },
    },
  },
};

module.exports = { loginBody, refreshBody, cambiarClaveBody, tokenPair };
