/**
 * producto.schema.js
 * Esquemas de validación para las rutas de producto.
 */

const stockSedeItem = {
  type: "object",
  properties: {
    sedeId: { type: "integer" },
    stockActual: { type: "integer" },
    sede: {
      type: "object",
      properties: { nombre: { type: "string" } },
    },
  },
};

const productoBase = {
  type: "object",
  properties: {
    codigo: { type: "integer" },
    descripcion: { type: "string" },
    precioCosto: { type: "number" },
    precioVenta: { type: "number" },
    precioMayoreo: { type: ["number", "null"] },
    porcentajeGanancia: { type: "number" },
    departamento: { type: ["string", "null"] },
    stockMinimo: { type: "integer" },
    activo: { type: "boolean" },
    creadoEn: { type: "string", format: "date-time" },
    actualizadoEn: { type: "string", format: "date-time" },
    proveedorId: { type: ["integer", "null"] },
    proveedor: {
      type: ["object", "null"],
      properties: {
        id: { type: "integer" },
        nombre: { type: "string" },
      },
    },
    stockSedes: { type: "array", items: stockSedeItem },
  },
};

// POST /api/productos
const crearProducto = {
  summary: "Crear un nuevo producto en el catálogo",
  tags: ["Productos"],
  security: [{ bearerAuth: [] }],
  body: {
    type: "object",
    required: ["descripcion", "precioCosto", "precioVenta"],
    properties: {
      descripcion: { type: "string", maxLength: 255 },
      precioCosto: { type: "number", minimum: 0 },
      precioVenta: { type: "number", minimum: 0 },
      precioMayoreo: { type: "number", minimum: 0 },
      porcentajeGanancia: { type: "number", minimum: 0 },
      departamento: { type: "string", maxLength: 100 },
      stockMinimo: { type: "integer", minimum: 0 },
      proveedorId: { type: ["integer", "null"] },
      sedeId: { type: "integer" },
    },
    additionalProperties: false,
  },
  response: {
    201: { ...productoBase, description: "Producto creado" },
    409: { type: "object", properties: { error: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// GET /api/productos
const listarProductos = {
  summary: "Listar productos del catálogo",
  tags: ["Productos"],
  security: [{ bearerAuth: [] }],
  querystring: {
    type: "object",
    properties: {
      descripcion: { type: "string" },
      activo: { type: "string", enum: ["true", "false"] },
      proveedorId: { type: "integer" },
      skip: { type: "integer", minimum: 0, default: 0 },
      take: { type: "integer", minimum: 1, maximum: 200, default: 50 },
    },
    additionalProperties: false,
  },
  response: {
    200: { type: "array", items: productoBase },
  },
};

// GET /api/productos/:codigo
const obtenerProducto = {
  summary: "Obtener un producto por su código",
  tags: ["Productos"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["codigo"],
    properties: { codigo: { type: "integer" } },
  },
  response: {
    200: productoBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// PATCH /api/productos/:codigo
const editarProducto = {
  summary: "Actualizar datos de un producto",
  tags: ["Productos"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["codigo"],
    properties: { codigo: { type: "integer" } },
  },
  body: {
    type: "object",
    properties: {
      descripcion: { type: "string", maxLength: 255 },
      precioCosto: { type: "number", minimum: 0 },
      precioVenta: { type: "number", minimum: 0 },
      precioMayoreo: { type: "number", minimum: 0 },
      porcentajeGanancia: { type: "number", minimum: 0 },
      departamento: { type: "string", maxLength: 100 },
      stockMinimo: { type: "integer", minimum: 0 },
      proveedorId: { type: "integer" },
      activo: { type: "boolean" },
    },
    minProperties: 1,
    additionalProperties: false,
  },
  response: {
    200: productoBase,
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

// DELETE /api/productos/:codigo  (desactivación lógica)
const desactivarProducto = {
  summary: "Desactivar un producto (baja lógica)",
  tags: ["Productos"],
  security: [{ bearerAuth: [] }],
  params: {
    type: "object",
    required: ["codigo"],
    properties: { codigo: { type: "integer" } },
  },
  response: {
    200: { type: "object", properties: { mensaje: { type: "string" } } },
    404: { type: "object", properties: { error: { type: "string" } } },
  },
};

module.exports = {
  crearProducto,
  listarProductos,
  obtenerProducto,
  editarProducto,
  desactivarProducto,
};
