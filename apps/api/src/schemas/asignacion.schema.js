const asignacionBase = {
  type: "object",
  properties: {
    id: { type: "integer" },
    pedidoId: { type: "integer" },
    estado: { type: "string" },
    asignadoEn: { type: "string", format: "date-time" },
    fechaConfirmada: { type: ["string", "null"], format: "date-time" },
    montoCobrado: { type: ["number", "null"] },
    montoEfectivo: { type: ["number", "null"] },
    montoTransferencia: { type: ["number", "null"] },
    abonoDeuda: { type: ["number", "null"] },
    metodoPago: { type: ["string", "null"] },
    observacionesEntrega: { type: ["string", "null"] },
    pedido: {
      type: "object",
      properties: {
        id: { type: "integer" },
        estado: { type: "string" },
        direccion: { type: ["string", "null"] },
        sedeId: { type: "integer" },
        creadoEn: { type: "string", format: "date-time" },
        detalles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
              productoId: { type: "integer" },
              cantidad: { type: "integer" },
              precioUnitario: { type: "number" },
              subtotal: { type: "number" },
              producto: {
                type: "object",
                properties: {
                  descripcion: { type: "string" },
                },
              },
            },
          },
        },
        cliente: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nombre: { type: "string" },
            telefono: { type: ["string", "null"] },
            saldoDeuda: { type: "number" },
          },
        },
      },
    },
    entregador: {
      type: "object",
      properties: {
        id: { type: "integer" },
        nombreCompleto: { type: "string" },
        telefono: { type: ["string", "null"] },
      },
    },
    asignador: {
      type: "object",
      properties: {
        id: { type: "integer" },
        nombreCompleto: { type: "string" },
      },
    },
  },
};

// POST /api/asignaciones
const crearAsignacion = {
  summary: "Asignar un pedido pendiente a un entregador",
  tags: ["Asignaciones"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["pedidoId", "entregadorId"],
    properties: {
      pedidoId: { type: "integer" },
      entregadorId: { type: "integer" },
      observacionesEntrega: { type: "string" },
    },
    additionalProperties: false,
  },
  response: {
    201: { ...asignacionBase, description: "Asignación creada" },
    400: { type: "object", properties: { error: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// GET /api/asignaciones
const listarAsignaciones = {
  summary: "Listar asignaciones con filtros opcionales",
  tags: ["Asignaciones"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      entregadorId: { type: "integer" },
      pedidoId: { type: "integer" },
      estado: {
        type: "string",
        enum: ["Pendiente", "EnRuta", "Entregado", "Fallido"],
      },
      skip: { type: "integer", minimum: 0, default: 0 },
      take: { type: "integer", minimum: 1, maximum: 100, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: { type: "array", items: asignacionBase },
  },
};

// GET /api/asignaciones/mis-entregas
const misEntregas = {
  summary: "Ver mis entregas asignadas (solo Entregador)",
  tags: ["Asignaciones"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      estado: {
        type: "string",
        enum: ["Pendiente", "EnRuta", "Entregado", "Fallido"],
      },
      skip: { type: "integer", minimum: 0, default: 0 },
      take: { type: "integer", minimum: 1, maximum: 100, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: { type: "array", items: asignacionBase },
  },
};

// GET /api/asignaciones/:id
const obtenerAsignacion = {
  summary: "Obtener una asignación por ID",
  tags: ["Asignaciones"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  response: {
    200: asignacionBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// PATCH /api/asignaciones/:id/estado
const actualizarEstado = {
  summary: "Actualizar estado de una asignación",
  description:
    "Transiciones válidas: Pendiente→EnRuta|Fallido, EnRuta→Entregado|Fallido. " +
    "Al marcar Entregado se requiere montoCobrado y metodoPago. " +
    "Si metodoPago es Mixto, se requieren montoEfectivo y montoTransferencia " +
    "(deben sumar montoCobrado). Si el cliente tiene saldoDeuda de pedidos " +
    "anteriores, se puede recibir un abonoDeuda adicional en el mismo momento.",
  tags: ["Asignaciones"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  body: {
    type: "object",
    required: ["nuevoEstado"],
    properties: {
      nuevoEstado: { type: "string", enum: ["EnRuta", "Entregado", "Fallido"] },
      montoCobrado: { type: "number", minimum: 0 },
      metodoPago: {
        type: "string",
        enum: ["Efectivo", "Transferencia", "Mixto", "Parcial", "Credito"],
      },
      montoEfectivo: { type: "number", minimum: 0 },
      montoTransferencia: { type: "number", minimum: 0 },
      abonoDeuda: { type: "number", minimum: 0 },
      fechaConfirmada: { type: ["string", "null"], format: "date-time" },
      observacionesEntrega: { type: "string" },
    },
    additionalProperties: false,
  },
  response: {
    200: asignacionBase,
    400: { type: "object", properties: { error: { type: "string" } } },
    403: { type: "object", properties: { error: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

module.exports = {
  crearAsignacion,
  listarAsignaciones,
  misEntregas,
  obtenerAsignacion,
  actualizarEstado,
};
