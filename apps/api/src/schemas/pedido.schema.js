/**
 * pedido.schema.js
 * Esquemas de validación para las rutas de pedido.
 */

const detalleItem = {
  type: "object",
  properties: {
    id:             { type: "integer" },
    productoId:     { type: "string" },
    productoNombre: { type: "string" },
    cantidad:       { type: "integer" },
    precioUnitario: { type: "number" },
    subtotal:       { type: "number" },
    producto: {
      type: "object",
      properties: {
        codigo:      { type: "string" },
        descripcion: { type: "string" },
      },
    },
  },
};

const pedidoBase = {
  type: "object",
  properties: {
    id:            { type: "integer" },
    estado:        { type: "string" },
    observaciones: { type: ["string", "null"] },
    totalRecibido: { type: "number" },
    creadoEn:      { type: "string", format: "date-time" },
    actualizadoEn: { type: "string", format: "date-time" },
    cliente: {
      type: "object",
      properties: {
        id:       { type: "integer" },
        nombre:   { type: "string" },
        telefono: { type: ["string", "null"] },
      },
    },
    creador: {
      type: "object",
      properties: {
        id:             { type: "integer" },
        nombreCompleto: { type: "string" },
      },
    },
    sedeId: { type: "integer" },
    sede: {
      type: "object",
      properties: {
        id:     { type: "integer" },
        nombre: { type: "string" },
      },
      additionalProperties: false,
    },
    detalles:     { type: "array", items: detalleItem },
    asignaciones: { type: "array" },
  },
};

// POST /api/pedidos
const crearPedido = {
  summary: "Crear un nuevo pedido con sus productos",
  tags: ["Pedidos"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["clienteId", "items"],
    properties: {
      clienteId:    { type: "integer" },
      sedeId:       { type: "integer", description: "Requerido para Admin (sin sede fija). Ignorado para Bodega/AdminBogota." },
      observaciones: { type: "string" },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["productoId", "cantidad"],
          properties: {
            productoId:     { type: "string" },
            cantidad:       { type: "integer", minimum: 1 },
            precioUnitario: { type: "number", minimum: 0, description: "Opcional; usa precioVenta del producto si se omite" },
          },
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
  response: {
    201: { ...pedidoBase, description: "Pedido creado" },
    400: { type: "object", properties: { error: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// GET /api/pedidos
const listarPedidos = {
  summary: "Listar pedidos con filtros opcionales",
  tags: ["Pedidos"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      clienteId:   { type: "integer" },
      estado:      { type: "string", enum: ["Pendiente", "Asignado", "Entregado", "Cancelado"] },
      creadoPorId: { type: "integer" },
      skip:        { type: "integer", minimum: 0, default: 0 },
      take:        { type: "integer", minimum: 1, maximum: 100, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: { type: "array", items: pedidoBase },
  },
};

// GET /api/pedidos/:id
const obtenerPedido = {
  summary: "Obtener un pedido por ID",
  tags: ["Pedidos"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  response: {
    200: pedidoBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// PATCH /api/pedidos/:id/estado
const cambiarEstadoPedido = {
  summary: "Cambiar el estado de un pedido",
  description: "Transiciones válidas: Pendiente→Asignado|Cancelado, Asignado→Entregado|Cancelado",
  tags: ["Pedidos"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  body: {
    type: "object",
    required: ["estado"],
    properties: {
      estado: { type: "string", enum: ["Asignado", "Entregado", "Cancelado"] },
    },
    additionalProperties: false,
  },
  response: {
    200: pedidoBase,
    400: { type: "object", properties: { error: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

module.exports = { crearPedido, listarPedidos, obtenerPedido, cambiarEstadoPedido };
