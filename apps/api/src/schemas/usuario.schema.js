/**
 * Schemas de validación para las rutas de usuarios.
 */

// Campos reutilizables
const rolEnum = { type: "string", enum: ["Admin", "Bodega", "AdminBogota", "Oficinista", "Entregador"] };

const usuarioResponse = {
  type: "object",
  properties: {
    id: { type: "integer" },
    nombreCompleto: { type: "string" },
    usuario: { type: "string" },
    correo: { type: "string" },
    telefono: { type: "string" },
    rol: rolEnum,
    sedeId: { type: "integer" },
    sede: {
      type: "object",
      nullable: true,
      properties: { nombre: { type: "string" } },
    },
    activo: { type: "boolean" },
    creadoEn: { type: "string", format: "date-time" },
  },
};

// POST /usuarios — crear usuario
const createUsuarioBody = {
  type: "object",
  required: [
    "nombreCompleto",
    "usuario",
    "contrasena",
    "rol",
    "sedeId",
  ],
  additionalProperties: false,
  properties: {
    nombreCompleto: { type: "string", minLength: 3, maxLength: 255 },
    usuario: {
      type: "string",
      minLength: 5,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_]+$",
      description: "Solo letras, números y guión bajo",
    },
    correo: { type: "string", format: "email", maxLength: 150 },
    contrasena: { type: "string", minLength: 6, maxLength: 25 },
    rol: rolEnum,
    telefono: {
      type: "string",
      minLength: 0,
      maxLength: 20,
      pattern: "^[0-9+\\-\\s]*$",
    },
    sedeId: { type: "integer", minimum: 1 },
    activo: { type: "boolean" },
  },
};

// PUT /usuarios/:id — actualizar usuario
const updateUsuarioBody = {
  type: "object",
  additionalProperties: false,
  minProperties: 1,
  properties: {
    nombreCompleto: { type: "string", minLength: 3, maxLength: 255 },
    usuario: {
      type: "string",
      minLength: 5,
      maxLength: 50,
      pattern: "^[a-zA-Z0-9_]+$",
      description: "Solo letras, números y guión bajo",
    },
    correo: { type: "string", format: "email", maxLength: 150 },
    telefono: {
      type: "string",
      minLength: 0,
      maxLength: 20,
      pattern: "^[0-9+\\-\\s]*$",
    },
    rol: rolEnum,
    sedeId: { type: "integer", minimum: 1 },
    activo: { type: "boolean" },
    contrasena: { type: "string", minLength: 6, maxLength: 25 },
  },
};

// Parámetro :id compartido
const idParam = {
  type: "object",
  properties: { id: { type: "string", pattern: "^[0-9]+$" } },
};

module.exports = {
  createUsuarioBody,
  updateUsuarioBody,
  usuarioResponse,
  idParam,
};
