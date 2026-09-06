/**
 * inventario.schema.js
 * Esquemas de validación para las rutas de inventario.
 */

const inventarioBase = {
  type: "object",
  properties: {
    id: { type: "integer" },
    fecha: { type: "string", format: "date-time" },
    semana: { type: "integer" },
    sedeId: { type: "integer" },
    productoId: { type: "integer" },
    cantidadIngresada: { type: "integer" },
    costoUnitario: { type: "number" },
    tipo: { type: "string" },
    nota: { type: ["string", "null"] },
    proveedorId: { type: ["integer", "null"] },
    deuda: { type: ["number", "null"] },
    creadoEn: { type: "string", format: "date-time" },
    sede: {
      type: "object",
      properties: {
        id: { type: "integer" },
        nombre: { type: "string" },
      },
    },
    producto: {
      type: "object",
      properties: {
        codigo: { type: "string" },
        descripcion: { type: "string" },
      },
    },
    proveedor: {
      type: "object",
      properties: {
        id: { type: "integer" },
        nombre: { type: "string" },
      },
    },
  },
};

// Item del historial por proveedor: inventarioBase + total y estado calculados
const historialEntrada = {
  ...inventarioBase,
  properties: {
    ...inventarioBase.properties,
    total: { type: "number" },
    estado: { type: "string" },
  },
};

// POST /api/inventario
const crearInventario = {
  summary: "Registrar entrada de inventario para un producto en una sede",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["fecha", "semana", "sedeId", "productoId", "cantidadIngresada"],
    properties: {
      fecha: { type: "string", format: "date" },
      semana: { type: "integer", minimum: 1, maximum: 53 },
      sedeId: { type: "integer" },
      productoId: { type: "integer" },
      cantidadIngresada: { type: "integer" }, // el signo se valida en el service según el tipo
      costoUnitario: { type: "number", minimum: 0 },
      tipo: { type: "string", enum: ["entrada", "salida", "ajuste"] },
      nota: { type: "string" },
      proveedorId: { type: "integer" }, // proveedor de la compra (opcional)
      deuda: { type: "number", minimum: 0 }, // monto pendiente por pagar (opcional)
    },
    additionalProperties: false,
  },
  response: {
    201: { ...inventarioBase, description: "Registro creado" },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// GET /api/inventario
const listarInventario = {
  summary: "Listar registros de inventario",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      fecha: { type: "string", format: "date" },
      semana: { type: "integer" },
      sedeId: { type: "integer" },
      productoId: { type: "integer" },
      tipo: { type: "string", enum: ["entrada", "salida", "ajuste"] },
      skip: { type: "integer", minimum: 0, default: 0 },
      take: { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: { type: "array", items: inventarioBase },
  },
};

// GET /api/inventario/:id
const obtenerInventario = {
  summary: "Obtener un registro de inventario por ID",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  response: {
    200: inventarioBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// PATCH /api/inventario/:id
const editarInventario = {
  summary: "Actualizar cantidad ingresada o costo de un registro",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  body: {
    type: "object",
    properties: {
      cantidadIngresada: { type: "integer" }, // el signo se valida en el service según el tipo
      costoUnitario: { type: "number", minimum: 0 },
    },
    minProperties: 1,
    additionalProperties: false,
  },
  response: {
    200: inventarioBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// DELETE /api/inventario/:id
const eliminarInventario = {
  summary: "Eliminar un registro de inventario",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "integer" } },
  },
  response: {
    200: { type: "object", properties: { mensaje: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// GET /api/inventario/resumen-semanal
const resumenSemanal = {
  summary: "Resumen consolidado de entradas por sede para una semana",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    required: ["semana"],
    properties: {
      semana: { type: "integer", minimum: 1, maximum: 53 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sede: { type: "string" },
          sedeId: { type: "integer" },
          producto: { type: "string" },
          productoId: { type: "integer" },
          cantidad: { type: "integer" },
          costoUnitario: { type: "number" },
          ultimaFecha: { type: "string", format: "date-time" },
        },
      },
    },
  },
};

// GET /api/inventario/deuda-proveedores
const resumenDeudaProveedores = {
  summary: "Saldo de deuda pendiente por proveedor (cuentas por pagar)",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      sedeId: { type: "integer" },
      semana: { type: "integer", minimum: 1, maximum: 53 },
    },
    additionalProperties: false,
  },
  response: {
    200: {
      type: "array",
      items: {
        type: "object",
        properties: {
          proveedor:      { type: "string" },
          proveedorId:    { type: "integer" },
          deudaPendiente: { type: "number" },
          totalAbonado:   { type: "number" },
          saldoPendiente: { type: "number" },
        },
      },
    },
  },
};

// GET /api/inventario/historial-proveedor/:proveedorId
const historialProveedor = {
  summary: "Historial de entradas de inventario de un proveedor",
  tags: ["Inventario"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["proveedorId"],
    properties: { proveedorId: { type: "integer" } },
  },
  querystring: {
    type: "object",
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
        proveedor: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nombre: { type: "string" },
            activo: { type: "boolean" },
          },
        },
        resumen: {
          type: "object",
          properties: {
            periodo: {
              type: "object",
              properties: {
                totalEntradas: { type: "integer" },
                montoTotal: { type: "number" },
                deudaRegistrada: { type: "number" },
              },
            },
            global: {
              type: "object",
              properties: {
                deudaRegistrada: { type: "number" },
                totalAbonado: { type: "number" },
                saldoPendiente: { type: "number" },
              },
            },
          },
        },
        entradas: { type: "array", items: historialEntrada },
      },
    },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

module.exports = {
  crearInventario,
  listarInventario,
  obtenerInventario,
  editarInventario,
  eliminarInventario,
  resumenSemanal,
  resumenDeudaProveedores,
  historialProveedor,
};
