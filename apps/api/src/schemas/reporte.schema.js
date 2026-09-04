
const sedeResumen = {
  type: "object",
  properties: { sede: { type: "string" }, sedeId: { type: "integer" } },
};

const arqueoSemanalSchema = {
  summary: "Arqueo semanal completo: ingresos, egresos, abonos y saldo neto",
  description: "Equivale a la hoja 'Arqueo Semanal' del Excel. Solo Admin.",
  tags: ["Reportes"], security: [{ bearerAuth: [] }],
  querystring: { type: "object", required: ["semana"], properties: { semana: { type: "integer", minimum: 1, maximum: 53 } }, additionalProperties: false },
  response: {
    200: {
      type: "object",
      properties: {
        semana:   { type: "integer" },
        ingresos: { type: "object", properties: { porSede: { type: "array", items: { ...sedeResumen, properties: { ...sedeResumen.properties, efectivo: { type: "number" }, cuentas: { type: "number" }, total: { type: "number" } } } }, totales: { type: "object" } } },
        egresos:  { type: "object", properties: { porSede: { type: "array", items: { ...sedeResumen, properties: { ...sedeResumen.properties, operativo: { type: "number" }, proveedores: { type: "number" }, totalEgresos: { type: "number" } } } }, totales: { type: "object" } } },
        saldoNeto: { type: "object", properties: { porSede: { type: "array" }, total: { type: "number" } } },
        cartera:   { type: "number" },
        costoInventario: { type: "number" },
      },
    },
  },
};

const panelGeneralSchema = {
  summary: "Panel general del día: ingresos, egresos, cartera y stock",
  description: "Equivale a la hoja 'Panel General' del Excel.",
  tags: ["Reportes"], security: [{ bearerAuth: [] }],
  querystring: { type: "object", required: ["fecha"], properties: { fecha: { type: "string", format: "date" }, sedeId: { type: "integer" } }, additionalProperties: false },
  response: {
    200: {
      type: "object",
      properties: {
        fecha:       { type: "string" },
        ingresos:    { type: "object" },
        egresos:     { type: "object" },
        cartera:     { type: "number" },
        totalStockUnidades: { type: "integer" },
        ventasHoy:          { type: "number" },
        pedidosPendientes:  { type: "integer" },
        entregasEnRuta:     { type: "integer" },
        alertasInventario:  { type: "integer" },
      },
    },
  },
};

const cobrosPorEntregadorSchema = {
  summary: "Cobros realizados por cada entregador en un rango de fechas",
  tags: ["Reportes"], security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    required: ["fechaInicio", "fechaFin"],
    properties: {
      fechaInicio: { type: "string", format: "date" },
      fechaFin:    { type: "string", format: "date" },
      sedeId:      { type: "integer" },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        fechaInicio: { type: "string" },
        fechaFin:    { type: "string" },
        total:       { type: "number" },
        totalDomicilios: { type: "number" },
        pedidos:     { type: "integer" },
        detalle: {
          type: "array",
          items: {
            type: "object",
            properties: {
              entregadorId:   { type: "integer" },
              entregador:     { type: "string" },
              pedidos:        { type: "integer" },
              total:          { type: "number" },
              efectivo:       { type: "number" },
              cuentas:        { type: "number" },
              valorDomicilio: { type: "number" },
            },
          },
        },
      },
    },
  },
};

const corteCajaSchema = {
  summary: "Corte de caja: ganancia vs. gasto en un rango de fechas",
  description:
    "Ganancia = lo recaudado por los entregadores (efectivo + transferencia + " +
    "abonos a deuda anterior) menos los egresos del período. Sirve para el " +
    "corte del día (desde == hasta), quincenal o mensual; el rango lo arma el " +
    "frontend.",
  tags: ["Reportes"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    required: ["desde", "hasta"],
    properties: {
      desde: { type: "string", format: "date" },
      hasta: { type: "string", format: "date" },
      sedeId: { type: "integer" },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "object",
      properties: {
        desde: { type: "string" },
        hasta: { type: "string" },
        recaudo: {
          type: "object",
          properties: {
            total: { type: "number" },
            efectivo: { type: "number" },
            transferencia: { type: "number" },
            abonosDeuda: { type: "number" },
            sinClasificar: { type: "number" },
            pedidosEntregados: { type: "integer" },
          },
        },
        egresos: {
          type: "object",
          properties: {
            total: { type: "number" },
            porConcepto: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  concepto: { type: "string" },
                  total: { type: "number" },
                },
              },
            },
          },
        },
        ganancia: { type: "number" },
        porDia: {
          type: "array",
          items: {
            type: "object",
            properties: {
              fecha: { type: "string" },
              recaudado: { type: "number" },
              egresos: { type: "number" },
              ganancia: { type: "number" },
            },
          },
        },
      },
    },
  },
};

module.exports = {
  arqueoSemanalSchema,
  panelGeneralSchema,
  cobrosPorEntregadorSchema,
  corteCajaSchema,
};
