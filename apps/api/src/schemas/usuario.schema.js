/**
 * Schemas de validación para las rutas de usuarios.
 */

// Campos reutilizables
const rolEnum = { type: "string", enum: ["Admin", "Bodega", "AdminBogota", "Oficinista", "Entregador"] };

// Contraseña: mínimo 5 caracteres, al menos un número y un símbolo
const contrasena = {
  type: "string",
  minLength: 5,
  maxLength: 25,
  pattern: "^(?=.*[0-9])(?=.*[^A-Za-z0-9\\s]).{5,}$",
  description: "Mínimo 5 caracteres, debe incluir al menos un número y un símbolo",
};

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
    entregadorSedes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sedeId: { type: "integer" },
          sede: {
            type: "object",
            nullable: true,
            properties: { nombre: { type: "string" } },
          },
        },
      },
    },
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
  ],
  additionalProperties: false,
  properties: {
    nombreCompleto: { type: "string", minLength: 3, maxLength: 255 },
    usuario: {
      type: "string",
      minLength: 5,
      maxLength: 25,
      pattern: "^[a-zA-Z0-9_]+$",
      description: "Solo letras, números y guión bajo",
    },
    correo: { type: "string", format: "email", maxLength: 150 },
    contrasena,
    rol: rolEnum,
    telefono: {
      type: "string",
      maxLength: 10,
      pattern: "^$|^[0-9]{10}$",
      description: "Vacío o exactamente 10 dígitos",
    },
    sedeId: { type: "integer", minimum: 1 },
    sedesIds: {
      type: "array",
      items: { type: "integer", minimum: 1 },
      minItems: 1,
      description: "Bodegas del entregador (se usa cuando el rol es Entregador).",
    },
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
      maxLength: 25,
      pattern: "^[a-zA-Z0-9_]+$",
      description: "Solo letras, números y guión bajo",
    },
    correo: { type: "string", format: "email", maxLength: 150 },
    telefono: {
      type: "string",
      maxLength: 10,
      pattern: "^$|^[0-9]{10}$",
      description: "Vacío o exactamente 10 dígitos",
    },
    rol: rolEnum,
    sedeId: { type: "integer", minimum: 1 },
    sedesIds: {
      type: "array",
      items: { type: "integer", minimum: 1 },
      minItems: 1,
      description: "Bodegas del entregador (se usa cuando el rol es Entregador).",
    },
    activo: { type: "boolean" },
    contrasena,
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
