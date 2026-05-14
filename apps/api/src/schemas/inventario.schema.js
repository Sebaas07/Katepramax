/**
 * Esquemas de validación para las rutas de inventario.
 * 
 */
const inventarioBase = {
  type: "object",
  properties: {
    id:       { type: "integer" },
    fecha:    { type: "string", format: "date" },
    semana:   { type: "integer", minimum: 1, maximum: 53 },
    sedeId:   { type: "integer" },
    cantidad: { type: "integer", minimum: 0 },
    costo:    { type: "number",  minimum: 0 },
    creadoEn: { type: "string", format: "date-time" },
    sede: {
      type: "object",
      properties: {
        id:     { type: "integer" },
        nombre: { type: "string" },
      },
    },
  },
};

// POST /api/inventario
const crearInventario = {
  summary: "Registrar inventario diario de una sede",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["fecha", "semana", "sedeId", "cantidad", "costo"],
    properties: {
      fecha:    { type: "string", format: "date", description: "Ej: 2026-04-18" },
      semana:   { type: "integer", minimum: 1, maximum: 53 },
      sedeId:   { type: "integer" },
      cantidad: { type: "integer", minimum: 0 },
      costo:    { type: "number",  minimum: 0 },
    },
    additionalProperties: false,
  },
  response: {
    201: { ...inventarioBase, description: "Registro creado" },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// GET /api/inventario
const listarInventario = {
  summary: "Listar registros de inventario",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      fecha:  { type: "string", format: "date" },
      semana: { type: "integer" },
      sedeId: { type: "integer" },
      skip:   { type: "integer", minimum: 0, default: 0 },
      take:   { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: { type: "array", items: inventarioBase },
  },
};

// GET /api/inventario/:id
const obtenerInventario = {
  summary: "Obtener un registro de inventario por ID",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  response: {
    200: inventarioBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// PATCH /api/inventario/:id
const editarInventario = {
  summary: "Actualizar cantidad o costo de un registro",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  body: {
    type: "object",
    properties: {
      cantidad: { type: "integer", minimum: 0 },
      costo:    { type: "number",  minimum: 0 },
    },
    minProperties: 1,
    additionalProperties: false,
  },
  response: {
    200: inventarioBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// DELETE /api/inventario/:id
const eliminarInventario = {
  summary: "Eliminar un registro de inventario",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  response: {
    200: { type: "object", properties: { mensaje: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// GET /api/inventario/resumen-semanal
const resumenSemanal = {
  summary: "Resumen de inventario consolidado por sede para una semana",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    required: ["semana"],
    properties: {
      semana: { type: "integer", minimum: 1, maximum: 53 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sede:        { type: "string" },
          sedeId:      { type: "integer" },
          cantidad:    { type: "integer" },
          costo:       { type: "number" },
          ultimaFecha: { type: "string", format: "date-time" },
        },
      },
    },
  },
};

module.exports = {
  crearInventario,
  listarInventario,
  obtenerInventario,
  editarInventario,
  eliminarInventario,
  resumenSemanal,
};
