const listar = {
  tags: ["Sedes"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      activo: { type: "string", enum: ["true", "false"] },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" },
          nombre: { type: "string" },
          activo: { type: "boolean" },
          creadoEn: { type: "string", format: "date-time" },
        },
      },
    },
  },
};

const crear = {
  tags: ["Sedes"],
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
    201: {
      type: "object",
      properties: {
        id: { type: "integer" },
        nombre: { type: "string" },
        activo: { type: "boolean" },
      },
    },
    409: {
      type: "object",
      properties: { error: { type: "string" } },
    },
  },
};

const editar = {
  tags: ["Sedes"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: {
      id: { type: "integer" },
    },
    additionalProperties: false,
  },
  body: {
    type: "object",
    properties: {
      nombre: { type: "string", minLength: 1, maxLength: 100 },
      activo: { type: "boolean" },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        id: { type: "integer" },
        nombre: { type: "string" },
        activo: { type: "boolean" },
      },
    },
    404: {
      type: "object",
      properties: { error: { type: "string" } },
    },
  },
};

module.exports = { listar, crear, editar };
