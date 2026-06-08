

// ─── egreso.schema.js ────────────────────────────────────────────────────────

const egresoBase = {
  type: "object",
  properties: {
    id:          { type: "integer" },
    fecha:       { type: "string", format: "date-time" },
    semana:      { type: "integer" },
    sedeId:      { type: "integer" },
    concepto:    { type: "string" },
    total:       { type: "number" },
    observacion: { type: "string", nullable: true },
    creadoEn:    { type: "string", format: "date-time" },
    sede:        { type: "object", properties: { id: { type: "integer" }, nombre: { type: "string" } } },
  },
};

const crearEgreso = {
  summary: "Registrar egreso diario de una sede",
  tags: ["Egresos"], security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["fecha", "semana", "sedeId", "concepto", "total"],
    properties: {
      fecha:       { type: "string", format: "date" },
      semana:      { type: "integer", minimum: 1, maximum: 53 },
      sedeId:      { type: "integer" },
      concepto:    { type: "string", maxLength: 200 },
      total:       { type: "number", minimum: 0 },
      observacion: { type: "string", maxLength: 500 },
    },
    additionalProperties: false,
  },
  response: { 201: egresoBase, 404: { type: "object", properties: { error: { type: "string" } } } },
};

const listarEgresos = {
  summary: "Listar egresos", tags: ["Egresos"], security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      fecha:    { type: "string", format: "date" },
      semana:   { type: "integer" },
      sedeId:   { type: "integer" },
      concepto: { type: "string" },
      skip:     { type: "integer", minimum: 0, default: 0 },
      take:     { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: { 200: { type: "array", items: egresoBase } },
};

const obtenerEgreso  = { summary: "Obtener egreso por ID",  tags: ["Egresos"], security: [{ bearerAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } }, response: { 200: egresoBase, 404: { type: "object", properties: { error: { type: "string" } } } } };
const editarEgreso   = { summary: "Editar egreso",          tags: ["Egresos"], security: [{ bearerAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } }, body: { type: "object", properties: { concepto: { type: "string" }, total: { type: "number", minimum: 0 }, observacion: { type: "string" } }, minProperties: 1, additionalProperties: false }, response: { 200: egresoBase } };
const eliminarEgreso = { summary: "Eliminar egreso",        tags: ["Egresos"], security: [{ bearerAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } }, response: { 200: { type: "object", properties: { mensaje: { type: "string" } } } } };

const resumenSemanalEgreso = {
  summary: "Resumen egresos por sede en una semana", tags: ["Egresos"], security: [{ bearerAuth: [] }],
  querystring: { type: "object", required: ["semana"], properties: { semana: { type: "integer", minimum: 1, maximum: 53 } }, additionalProperties: false },
  response: { 200: { type: "object", properties: { porSede: { type: "array", items: { type: "object", properties: { sede: { type: "string" }, sedeId: { type: "integer" }, registros: { type: "integer" }, total: { type: "number" } } } }, totalGeneral: { type: "number" } } } },
};

const resumenConcepto = {
  summary: "Egresos agrupados por concepto en una semana", tags: ["Egresos"], security: [{ bearerAuth: [] }],
  querystring: { type: "object", required: ["semana"], properties: { semana: { type: "integer" } }, additionalProperties: false },
  response: { 200: { type: "array", items: { type: "object", properties: { concepto: { type: "string" }, registros: { type: "integer" }, total: { type: "number" } } } } },
};

const totalesDiaEgreso = {
  summary: "Totales de egresos por día", tags: ["Egresos"], security: [{ bearerAuth: [] }],
  querystring: { type: "object", required: ["semana"], properties: { semana: { type: "integer" } }, additionalProperties: false },
  response: { 200: { type: "array", items: { type: "object", properties: { fecha: { type: "string", format: "date-time" }, total: { type: "number" } } } } },
};

module.exports = { crearEgreso, listarEgresos, obtenerEgreso, editarEgreso, eliminarEgreso, resumenSemanalEgreso, resumenConcepto, totalesDiaEgreso };
