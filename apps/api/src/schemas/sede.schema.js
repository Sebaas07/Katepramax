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
        },
      },
    },
  },
};

module.exports = { listar };
