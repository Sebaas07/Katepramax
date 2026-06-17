

const abonoBase = {
  type: "object",
  properties: {
    id:          { type: "integer" },
    fecha:       { type: "string", format: "date-time" },
    semana:      { type: "integer" },
    valorPagado: { type: "number" },
    observacion: { type: "string", nullable: true },
    creadoEn:    { type: "string", format: "date-time" },
    proveedor:   { type: "object", properties: { id: { type: "integer" }, nombre: { type: "string" } } },
    sede:        { type: "object", properties: { id: { type: "integer" }, nombre: { type: "string" } } },
  },
};

const crearAbono = {
  summary: "Registrar pago a proveedor (Admin / Bodega)",
  tags: ["Abonos"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["fecha", "semana", "proveedorId", "sedeId", "valorPagado"],
    properties: {
      fecha:       { type: "string", format: "date" },
      semana:      { type: "integer", minimum: 1, maximum: 53 },
      proveedorId: { type: "integer" },
      sedeId:      { type: "integer" },
      valorPagado: { type: "number", minimum: 0.01 },
      observacion: { type: "string", maxLength: 500 },
    },
    additionalProperties: false,
  },
  response: {
    201: { ...abonoBase, description: "Abono registrado" },
    404: { type: "object", properties: { error: { type: "string" } } },
    422: { type: "object", properties: { error: { type: "string" } } },
  },
};

const listarAbonos = {
  summary: "Listar abonos a proveedores",
  tags: ["Abonos"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      proveedorId: { type: "integer" },
      sedeId:      { type: "integer" },
      semana:      { type: "integer" },
      fecha:       { type: "string", format: "date" },
      skip:        { type: "integer", minimum: 0, default: 0 },
      take:        { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: { 200: { type: "array", items: abonoBase } },
};

const obtenerAbono = {
  summary: "Obtener un abono por ID",
  tags: ["Abonos"],
  security: [{ bearerAuth: [] }],
  params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  response: {
    200: abonoBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

const editarAbono = {
  summary: "Editar valor o observación de un abono",
  tags: ["Abonos"],
  security: [{ bearerAuth: [] }],
  params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  body: {
    type: "object",
    properties: {
      valorPagado: { type: "number", minimum: 0.01 },
      observacion: { type: "string", maxLength: 500 },
    },
    minProperties: 1,
    additionalProperties: false,
  },
  response: {
    200: abonoBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

const eliminarAbono = {
  summary: "Eliminar un abono (solo Admin)",
  tags: ["Abonos"],
  security: [{ bearerAuth: [] }],
  params: { type: "object", required: ["id"], properties: { id: { type: "integer" } } },
  response: {
    200: { type: "object", properties: { mensaje: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

const resumenProveedor = {
  summary: "Total pagado por proveedor en una semana",
  tags: ["Abonos"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    required: ["semana"],
    properties: { semana: { type: "integer", minimum: 1, maximum: 53 } },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          proveedor:   { type: "string" },
          proveedorId: { type: "integer" },
          abonos:      { type: "integer" },
          totalPagado: { type: "number" },
        },
      },
    },
  },
};

const resumenSede = {
  summary: "Total pagado a proveedores por sede en una semana (para Arqueo)",
  tags: ["Abonos"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    required: ["semana"],
    properties: { semana: { type: "integer", minimum: 1, maximum: 53 } },
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
          totalPagado: { type: "number" },
        },
      },
    },
  },
};

module.exports = { crearAbono, listarAbonos, obtenerAbono, editarAbono, eliminarAbono, resumenProveedor, resumenSede };
