const listarLogsSchema = {
  summary: "Listar el historial de acciones de los usuarios",
  tags: ["Logs"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      usuarioId: { type: "integer" },
      accion: { type: "string" },
      fechaInicio: { type: "string", format: "date" },
      fechaFin: { type: "string", format: "date" },
      skip: { type: "integer", minimum: 0, default: 0 },
      take: { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        total: { type: "integer" },
        skip: { type: "integer" },
        take: { type: "integer" },
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
              accion: { type: "string" },
              descripcion: { type: "string" },
              creadoEn: { type: "string" },
              usuarioId: { type: "integer" },
              usuario: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  nombreCompleto: { type: "string" },
                  rol: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  },
};

const listarAccionesSchema = {
  summary: "Listar los tipos de acción distintos registrados en el log",
  tags: ["Logs"],
  security: [{ bearerAuth: [] }],
  response: {
    200: { type: "array", items: { type: "string" } },
  },
};

module.exports = { listarLogsSchema, listarAccionesSchema };
