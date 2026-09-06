
// ingreso.schema.js

const ingresoBase = {
  type: "object",
  properties: {
    id:          { type: "integer" },
    fecha:       { type: "string", format: "date-time" },
    semana:      { type: "integer" },
    sedeId:      { type: "integer" },
    efectivo:    { type: "number" },
    cuentas:     { type: "number" },
    total:       { type: "number" },
    observacion: { type: "string", nullable: true },
    origen:      { type: "string" },
    idReferencia: { type: "integer", nullable: true },
    fechaCreacion: { type: "string", format: "date-time" },
    sede:        { type: "object", properties: { id: { type: "integer" }, nombre: { type: "string" } } },
  },
};

const crearIngreso = {
  summary: "Registrar ingreso diario de una sede", tags: ["Ingresos"], security: [{ bearerAuth: [] }],
  body: {
    type: "object", required: ["fecha", "semana", "sedeId"],
    properties: {
      fecha:       { type: "string", format: "date" },
      semana:      { type: "integer", minimum: 1, maximum: 53 },
      sedeId:      { type: "integer" },
      efectivo:    { type: "number", minimum: 0, default: 0 },
      cuentas:     { type: "number", minimum: 0, default: 0 },
      observacion: { type: "string", maxLength: 500 },
    },
    additionalProperties: false,
  },
  response: { 201: ingresoBase, 404: { type: "object", properties: { error: { type: "string" } } } },
};

const listarIngresos = {
  summary: "Listar ingresos", tags: ["Ingresos"], security: [{ bearerAuth: [] }],
  querystring: { type: "object", properties: { fecha: { type: "string", format: "date" }, semana: { type: "integer" }, sedeId: { type: "integer" }, skip: { type: "integer", minimum: 0, default: 0 }, take: { type: "integer", minimum: 1, maximum: 200, default: 50 } }, additionalProperties: false },
  response: { 200: { type: "array", items: ingresoBase } },
};

const obtenerIngreso  = { summary: "Obtener ingreso por ID", tags: ["Ingresos"], security: [{ bearerAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } }, response: { 200: ingresoBase, 404: { type: "object", properties: { error: { type: "string" } } } } };
const editarIngreso   = { summary: "Editar ingreso", tags: ["Ingresos"], security: [{ bearerAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } }, body: { type: "object", properties: { efectivo: { type: "number", minimum: 0 }, cuentas: { type: "number", minimum: 0 }, observacion: { type: "string" } }, minProperties: 1, additionalProperties: false }, response: { 200: ingresoBase } };
const eliminarIngreso = { summary: "Eliminar ingreso", tags: ["Ingresos"], security: [{ bearerAuth: [] }], params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } }, response: { 200: { type: "object", properties: { mensaje: { type: "string" } } } } };

const resumenSemanalIngreso = {
  summary: "Resumen ingresos por sede en una semana", tags: ["Ingresos"], security: [{ bearerAuth: [] }],
  querystring: { type: "object", required: ["semana"], properties: { semana: { type: "integer", minimum: 1, maximum: 53 } }, additionalProperties: false },
  response: { 200: { type: "object", properties: { porSede: { type: "array", items: { type: "object", properties: { sede: { type: "string" }, sedeId: { type: "integer" }, efectivo: { type: "number" }, cuentas: { type: "number" }, total: { type: "number" } } } }, totalGeneral: { type: "object", properties: { efectivo: { type: "number" }, cuentas: { type: "number" }, total: { type: "number" } } } } } },
};

const totalesDiaIngreso = {
  summary: "Totales de ingresos por día en una semana", tags: ["Ingresos"], security: [{ bearerAuth: [] }],
  querystring: { type: "object", required: ["semana"], properties: { semana: { type: "integer" } }, additionalProperties: false },
  response: { 200: { type: "array", items: { type: "object", properties: { fecha: { type: "string", format: "date-time" }, efectivo: { type: "number" }, cuentas: { type: "number" }, total: { type: "number" } } } } },
};

module.exports = { crearIngreso, listarIngresos, obtenerIngreso, editarIngreso, eliminarIngreso, resumenSemanalIngreso, totalesDiaIngreso };
