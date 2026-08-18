const sedeResumen = {
  type: "object",
  properties: {
    id: { type: "integer" },
    nombre: { type: "string" },
  },
};

const usuarioResumen = {
  type: "object",
  properties: {
    id: { type: "integer" },
    nombreCompleto: { type: "string" },
  },
};

const envioDetalleBase = {
  type: "object",
  properties: {
    id: { type: "integer" },
    productoId: { type: "integer" },
    cantidadEnviada: { type: "integer" },
    cantidadRecibida: { type: ["integer", "null"] },
    observacion: { type: ["string", "null"] },
    producto: {
      type: "object",
      properties: {
        codigo: { type: "integer" },
        descripcion: { type: "string" },
        sku: { type: "string" },
      },
    },
  },
};

const envioBase = {
  type: "object",
  properties: {
    id: { type: "integer" },
    sedeOrigenId: { type: "integer" },
    sedeDestinoId: { type: "integer" },
    creadoPorId: { type: "integer" },
    confirmadoPorId: { type: ["integer", "null"] },
    canceladoPorId: { type: ["integer", "null"] },
    estado: { type: "string", enum: ["Pendiente", "Confirmado", "ConNovedad", "Cancelado"] },
    observaciones: { type: ["string", "null"] },
    observacionRecepcion: { type: ["string", "null"] },
    fechaEnvio: { type: "string" },
    fechaConfirmacion: { type: ["string", "null"] },
    fechaCancelacion: { type: ["string", "null"] },
    sedeOrigen: sedeResumen,
    sedeDestino: sedeResumen,
    creador: usuarioResumen,
    confirmador: { anyOf: [usuarioResumen, { type: "null" }] },
    cancelador: { anyOf: [usuarioResumen, { type: "null" }] },
    detalles: { type: "array", items: envioDetalleBase },
  },
};

const crearEnvio = {
  summary: "Crear una guía de envío hacia una o varias sedes",
  description:
    "Solo Admin o AdminBogota. Crea un Envio por cada sede destino, descuenta " +
    "el stock de la sede origen y registra la salida en Inventario. La sede " +
    "destino ve el envío como 'Pendiente' hasta que confirme la recepción.",
  tags: ["Envios"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["sedesDestinoIds", "detalles"],
    properties: {
      sedeOrigenId: { type: "integer" },
      sedesDestinoIds: { type: "array", items: { type: "integer" }, minItems: 1 },
      detalles: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["productoId", "cantidad"],
          properties: {
            productoId: { type: "integer" },
            cantidad: { type: "integer", minimum: 1 },
          },
        },
      },
      observaciones: { type: "string" },
    },
    additionalProperties: false,
  },
  response: {
    201: { type: "array", items: envioBase },
  },
};

const listarEnvios = {
  summary: "Listar envíos entre sedes",
  description:
    "direccion=enviados muestra los envíos que salieron de mi sede; " +
    "direccion=recibidos muestra los que llegan a mi sede; sin indicar, ambos.",
  tags: ["Envios"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      direccion: { type: "string", enum: ["enviados", "recibidos"] },
      estado: { type: "string", enum: ["Pendiente", "Confirmado", "ConNovedad", "Cancelado"] },
      sedeId: { type: "integer" },
      skip: { type: "integer", minimum: 0, default: 0 },
      take: { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: { type: "array", items: envioBase },
  },
};

const contarPendientes = {
  summary: "Cantidad de envíos pendientes por confirmar en mi sede",
  tags: ["Envios"],
  security: [{ bearerAuth: [] }],
  response: {
    200: {
      type: "object",
      properties: { pendientes: { type: "integer" } },
    },
  },
};

const obtenerEnvio = {
  summary: "Obtener un envío por id",
  tags: ["Envios"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  response: { 200: envioBase },
};

const confirmarEnvio = {
  summary: "Confirmar la recepción de un envío",
  description:
    "Solo la sede DESTINO (la que recibe) puede confirmar; la sede que envió no " +
    "puede confirmar su propio envío. Si alguna cantidadRecibida es menor a la " +
    "enviada, se exige una observación (faltante o unidades dañadas). Las " +
    "cantidades confirmadas ingresan al inventario de la sede destino.",
  tags: ["Envios"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  body: {
    type: "object",
    required: ["detalles"],
    properties: {
      detalles: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["envioDetalleId", "cantidadRecibida"],
          properties: {
            envioDetalleId: { type: "integer" },
            cantidadRecibida: { type: "integer", minimum: 0 },
            observacion: { type: "string" },
          },
        },
      },
      observacionRecepcion: { type: "string" },
    },
    additionalProperties: false,
  },
  response: { 200: envioBase },
};

const cancelarEnvio = {
  summary: "Cancelar un envío pendiente",
  description:
    "Solo la sede ORIGEN (la que despachó) puede cancelar el envío y solo " +
    "mientras esté 'Pendiente'. Al cancelar se devuelve el stock a la sede " +
    "origen y se registra la reversión en Inventario.",
  tags: ["Envios"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  response: { 200: envioBase },
};

module.exports = {
  crearEnvio,
  listarEnvios,
  contarPendientes,
  obtenerEnvio,
  confirmarEnvio,
  cancelarEnvio,
};
