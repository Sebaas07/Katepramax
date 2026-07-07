/**
 * Esquemas de validación para las rutas de cliente.
 */
const clienteBase = {
  type: "object",
  properties: {
    id: { type: "integer" },
    nombre: { type: "string" },
    limiteCredito: { type: "number" },
    saldoDeuda: { type: "number" },
    telefono: { type: ["string", "null"] },
    sedeId: { type: ["integer", "null"] },
    activo: { type: "boolean" },
    creadoEn: { type: "string", format: "date-time" },
    actualizadoEn: { type: "string", format: "date-time" },
    sede: {
      type: ["object", "null"],
      nullable: true,
      properties: {
        id: { type: "integer" },
        nombre: { type: "string" },
      },
    },
  },
};

// POST /api/clientes
const crearCliente = {
  summary: "Crear un nuevo cliente",
  tags: ["Clientes"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["nombre"],
    properties: {
      nombre: { type: "string", minLength: 1, maxLength: 150 },
      telefono: { type: "string", maxLength: 20 },
      limiteCredito: { type: "number", minimum: 0 },
      saldoDeuda: { type: "number", minimum: 0 },
      sedeId: { type: "integer" },
    },
    additionalProperties: false,
  },
  response: {
    201: { ...clienteBase, description: "Cliente creado" },
    409: { type: "object", properties: { error: { type: "string" } } },
  },
};

// GET /api/clientes
const listarClientes = {
  summary: "Listar clientes",
  tags: ["Clientes"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      nombre: { type: "string" },
      activo: { type: "string", enum: ["true", "false"] },
      sedeId: { type: "integer" },
      skip: { type: "integer", minimum: 0, default: 0 },
      take: { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: { type: "array", items: clienteBase },
  },
};

// GET /api/clientes/:id
const obtenerCliente = {
  summary: "Obtener un cliente por su ID",
  tags: ["Clientes"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[0-9]+$" } },
  },
  response: {
    200: clienteBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// PATCH /api/clientes/:id
const editarCliente = {
  summary: "Actualizar datos de un cliente",
  tags: ["Clientes"],
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
      nombre: { type: "string", minLength: 1, maxLength: 150 },
      telefono: { type: "string", maxLength: 20 },
      activo: { type: "boolean" },
      limiteCredito: { type: "number", minimum: 0 },
      saldoDeuda: { type: "number", minimum: 0 },
      sedeId: { type: ["integer", "null"] },
    },
    additionalProperties: false,
  },
  response: {
    200: clienteBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// DELETE /api/clientes/:id
const desactivarCliente = {
  summary: "Desactivar un cliente (baja lógica)",
  tags: ["Clientes"],
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

// POST /api/clientes/:id/abonar
const abonarCliente = {
  summary: "Abonar a la deuda de un cliente",
  tags: ["Clientes"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string", pattern: "^[0-9]+$" } },
  },
  body: {
    type: "object",
    required: ["monto"],
    properties: {
      monto: { type: "number", minimum: 0.01 },
    },
    additionalProperties: false,
  },
  response: {
    200: clienteBase,
    400: { type: "object", properties: { error: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

module.exports = {
  crearCliente,
  listarClientes,
  obtenerCliente,
  editarCliente,
  desactivarCliente,
  abonarCliente,
};
