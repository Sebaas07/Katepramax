/**
 * proveedor.schema.js
 * Esquemas de validación para las rutas de proveedor.
 */

const proveedorBase = {
  type: "object",
  properties: {
    id:        { type: "integer" },
    nombre:    { type: "string" },
    activo:    { type: "boolean" },
    creadoEn:  { type: "string", format: "date-time" },
  },
};

// POST /api/proveedores
const crearProveedor = {
  summary: "Crear un nuevo proveedor",
  tags: ["Proveedores"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["nombre"],
    properties: {
      nombre: { type: "string", minLength: 1, maxLength: 100 },
    },
    additionalProperties: false,
  },
  response: {
    201: { ...proveedorBase, description: "Proveedor creado" },
    409: { type: "object", properties: { error: { type: "string" } } },
  },
};

// GET /api/proveedores
const listarProveedores = {
  summary: "Listar proveedores",
  tags: ["Proveedores"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      nombre: { type: "string" },
      activo: { type: "string", enum: ["true", "false"] },
      skip:   { type: "integer", minimum: 0, default: 0 },
      take:   { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: { type: "array", items: proveedorBase },
  },
};

// GET /api/proveedores/:id
const obtenerProveedor = {
  summary: "Obtener un proveedor por su ID",
  tags: ["Proveedores"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[0-9]+$" } },
  },
  response: {
    200: proveedorBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// PATCH /api/proveedores/:id
const editarProveedor = {
  summary: "Actualizar datos de un proveedor",
  tags: ["Proveedores"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[0-9]+$" } },
  },
  body: {
    type: "object",
    minProperties: 1,
    properties: {
      nombre: { type: "string", minLength: 1, maxLength: 100 },
      activo: { type: "boolean" },
    },
    additionalProperties: false,
  },
  response: {
    200: proveedorBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// DELETE /api/proveedores/:id
const desactivarProveedor = {
  summary: "Desactivar un proveedor (baja lógica)",
  tags: ["Proveedores"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[0-9]+$" } },
  },
  response: {
    200: { type: "object", properties: { mensaje: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

module.exports = {
  crearProveedor,
  listarProveedores,
  obtenerProveedor,
  editarProveedor,
  desactivarProveedor,
};