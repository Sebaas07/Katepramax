const carteraBase = {
  type: "object",
  properties: {
    id:             { type: "integer" },
    fecha:          { type: "string", format: "date" },
    semana:         { type: "integer" },
    sedeId:         { type: "integer" },
    saldoDia:       { type: "number" },
    saldoAnterior:  { type: "number" },
    variacion:      { type: "number" },
    creadoEn:       { type: "string", format: "date-time" },
    sede:           { type: "object", properties: { id: { type: "integer" }, nombre: { type: "string" } } },
  },
};

const crearCartera = {
  summary: "Registrar saldo de cartera por sede",
  tags: ["Cartera"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["fecha", "semana", "sedeId", "saldoDia"],
    properties: {
      fecha:    { type: "string", format: "date" },
      semana:   { type: "integer", minimum: 1, maximum: 53 },
      sedeId:   { type: "integer" },
      saldoDia: { type: "number", minimum: 0.01 },
    },
    additionalProperties: false,
  },
  response: {
    201: carteraBase,
    404: { type: "object", properties: { error: { type: "string" } } },
    422: { type: "object", properties: { error: { type: "string" } } },
  },
};

const listarCartera = {
  summary: "Listar saldos de cartera",
  tags: ["Cartera"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      fecha:  { type: "string", format: "date" },
      semana: { type: "integer", minimum: 1, maximum: 53 },
      sedeId: { type: "integer" },
      skip:   { type: "integer", minimum: 0, default: 0 },
      take:   { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: { 200: { type: "array", items: carteraBase } },
};

const obtenerCartera = {
  summary: "Obtener saldo de cartera por ID",
  tags: ["Cartera"],
  security: [{ bearerAuth: [] }],
  params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  response: {
    200: carteraBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

const editarCartera = {
  summary: "Editar saldo de cartera",
  tags: ["Cartera"],
  security: [{ bearerAuth: [] }],
  params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  body: {
    type: "object",
    minProperties: 1,
    properties: {
      fecha:    { type: "string", format: "date" },
      semana:   { type: "integer", minimum: 1, maximum: 53 },
      sedeId:   { type: "integer" },
      saldoDia: { type: "number", minimum: 0.01 },
    },
    additionalProperties: false,
  },
  response: {
    200: carteraBase,
    404: { type: "object", properties: { error: { type: "string" } } },
    422: { type: "object", properties: { error: { type: "string" } } },
  },
};

const eliminarCartera = {
  summary: "Eliminar saldo de cartera",
  tags: ["Cartera"],
  security: [{ bearerAuth: [] }],
  params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  response: {
    200: { type: "object", properties: { mensaje: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

module.exports = { crearCartera, listarCartera, obtenerCartera, editarCartera, eliminarCartera };
