// ============================================================
// datosInventario.mock.js — Katepramax
// Datos de prueba para desarrollo frontend - Módulo de Inventario
// Cuando el backend esté listo, estos se reemplazan por
// llamadas reales a la API en los services correspondientes
// ============================================================

// ─── Productos ────────────────────────────────────────────────
export const PRODUCTOS_MOCK = [
  {
    id: 1,
    codigo: "PROD-001",
    nombre: "Arroz Diana x 500g",
    departamento: "Abastecimiento",
    existencia: 150,
    precioLlegada: 2800,
    precioDetal: 3500,
    precioMayoreo: 3200,
    unidadMedida: "unidad",
    stockMinimo: 50,
    activo: true,
    sedeId: 1,
    proveedorId: 1,
    proveedor: { nombre: "ABC Distribuidora" },
    sede: { nombre: "Bogotá" },
    fechaCreacion: "2025-05-01T08:00:00",
    fechaActualizacion: "2025-05-10T14:30:00"
  },
  {
    id: 2,
    codigo: "PROD-002",
    nombre: "Aceite Girasol x 1L",
    departamento: "Abastecimiento",
    existencia: 85,
    precioLlegada: 10500,
    precioDetal: 12500,
    precioMayoreo: 11800,
    unidadMedida: "unidad",
    stockMinimo: 100,
    activo: true,
    sedeId: 1,
    proveedorId: 2,
    proveedor: { nombre: "Distribuidora XYZ" },
    sede: { nombre: "Bogotá" },
    fechaCreacion: "2025-05-02T09:15:00",
    fechaActualizacion: "2025-05-11T10:00:00"
  },
  {
    id: 3,
    codigo: "PROD-003",
    nombre: "Leche Alquería x 1L",
    departamento: "Lácteos",
    existencia: 220,
    precioLlegada: 3200,
    precioDetal: 3900,
    precioMayoreo: 3600,
    unidadMedida: "unidad",
    stockMinimo: 80,
    activo: true,
    sedeId: 2,
    proveedorId: 1,
    proveedor: { nombre: "ABC Distribuidora" },
    sede: { nombre: "Cartagena" },
    fechaCreacion: "2025-05-03T10:30:00",
    fechaActualizacion: "2025-05-12T09:45:00"
  },
  {
    id: 4,
    codigo: "PROD-004",
    nombre: "Huevos x 30 unidades",
    departamento: "Lácteos",
    existencia: 95,
    precioLlegada: 11000,
    precioDetal: 13500,
    precioMayoreo: 12800,
    unidadMedida: "paquete",
    stockMinimo: 40,
    activo: true,
    sedeId: 3,
    proveedorId: 3,
    proveedor: { nombre: "Huevos del Campo" },
    sede: { nombre: "Villavicencio" },
    fechaCreacion: "2025-05-04T11:20:00",
    fechaActualizacion: "2025-05-12T16:20:00"
  },
  {
    id: 5,
    codigo: "PROD-005",
    nombre: "Panela Redonda x 250g",
    departamento: "Abarrotes",
    existencia: 300,
    precioLlegada: 1800,
    precioDetal: 2200,
    precioMayoreo: 2000,
    unidadMedida: "unidad",
    stockMinimo: 100,
    activo: true,
    sedeId: 1,
    proveedorId: 1,
    proveedor: { nombre: "ABC Distribuidora" },
    sede: { nombre: "Bogotá" },
    fechaCreacion: "2025-05-05T12:45:00",
    fechaActualizacion: "2025-05-13T08:10:00"
  },
  {
    id: 6,
    codigo: "PROD-006",
    nombre: "Azúcar Blanca x 1kg",
    departamento: "Abastecimiento",
    existencia: 75,
    precioLlegada: 2600,
    precioDetal: 3200,
    precioMayoreo: 2900,
    unidadMedida: "unidad",
    stockMinimo: 100,
    activo: true,
    sedeId: 1,
    proveedorId: 2,
    proveedor: { nombre: "Distribuidora XYZ" },
    sede: { nombre: "Bogotá" },
    fechaCreacion: "2025-05-06T14:30:00",
    fechaActualizacion: "2025-05-13T15:40:00"
  },
  {
    id: 7,
    codigo: "PROD-007",
    nombre: "Frijoles Negros x 1kg",
    departamento: "Abastecimiento",
    existencia: 120,
    precioLlegada: 5600,
    precioDetal: 6800,
    precioMayoreo: 6200,
    unidadMedida: "unidad",
    stockMinimo: 40,
    activo: true,
    sedeId: 2,
    proveedorId: 1,
    proveedor: { nombre: "ABC Distribuidora" },
    sede: { nombre: "Cartagena" },
    fechaCreacion: "2025-05-07T08:50:00",
    fechaActualizacion: "2025-05-14T11:25:00"
  },
  {
    id: 8,
    codigo: "PROD-008",
    nombre: "Leche de Coco x 400ml",
    departamento: "Lácteos",
    existencia: 15,
    precioLlegada: 3800,
    precioDetal: 4600,
    precioMayoreo: 4200,
    unidadMedida: "unidad",
    stockMinimo: 20,
    activo: true,
    sedeId: 3,
    proveedorId: 3,
    proveedor: { nombre: "Artesanal del Llano" },
    sede: { nombre: "Villavicencio" },
    fechaCreacion: "2025-05-08T16:10:00",
    fechaActualizacion: "2025-05-14T17:05:00"
  }
];

// ─── Movimientos de Inventario ────────────────────────────────
export const MOVIMIENTOS_INVENTARIO_MOCK = [
  {
    id: 1,
    fecha: "2025-05-11T08:30:00",
    productoId: 1,
    productoNombre: "Arroz Diana x 500g",
    tipo: "entrada",
    cantidad: 100,
    nota: "Compra semanal a Proveedor ABC",
    usuarioId: 1,
    usuarioNombre: "Laura Jiménez",
    costoTotal: 280000
  },
  {
    id: 2,
    fecha: "2025-05-11T09:15:00",
    productoId: 2,
    productoNombre: "Aceite Girasol x 1L",
    tipo: "salida",
    cantidad: 25,
    nota: "Despacho a tienda Centro",
    usuarioId: 5,
    usuarioNombre: "Juan Torres",
    costoTotal: 262500
  },
  {
    id: 3,
    fecha: "2025-05-11T10:00:00",
    productoId: 3,
    productoNombre: "Leche Alquería x 1L",
    tipo: "ajuste",
    cantidad: -10,
    nota: "Ajuste por vencimiento cercano",
    usuarioId: 1,
    usuarioNombre: "Laura Jiménez",
    costoTotal: -32000
  },
  {
    id: 4,
    fecha: "2025-05-11T11:45:00",
    productoId: 4,
    productoNombre: "Huevos x 30 unidades",
    tipo: "entrada",
    cantidad: 50,
    nota: "Recepción de pedido urgente",
    usuarioId: 5,
    usuarioNombre: "Juan Torres",
    costoTotal: 550000
  },
  {
    id: 5,
    fecha: "2025-05-11T13:20:00",
    productoId: 5,
    productoNombre: "Panela Redonda x 250g",
    tipo: "salida",
    cantidad: 75,
    nota: "Venta a supermercado Sur",
    usuarioId: 2,
    usuarioNombre: "Carlos Mendoza",
    costoTotal: 150000
  },
  {
    id: 6,
    fecha: "2025-05-11T14:10:00",
    productoId: 6,
    productoNombre: "Azúcar Blanca x 1kg",
    tipo: "entrada",
    cantidad: 50,
    nota: "Reposición de stock",
    usuarioId: 1,
    usuarioNombre: "Laura Jiménez",
    costoTotal: 130000
  },
  {
    id: 7,
    fecha: "2025-05-11T15:30:00",
    productoId: 7,
    productoNombre: "Frijoles Negros x 1kg",
    tipo: "salida",
    cantidad: 30,
    nota: "Despacho a restaurante Local",
    usuarioId: 5,
    usuarioNombre: "Juan Torres",
    costoTotal: 186000
  }
];

// ─── Estados de Movimiento (reutilizar CONFIG_ESTADO si es necesario) ─────
export const TIPO_MOVIMIENTO = {
  entrada: { label: "Entrada", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  salida: { label: "Salida", color: "#ef4444", bg: "rgba(236,68,64,0.1)" },
  ajuste: { label: "Ajuste", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" }
};