// ============================================================
// datosCartagena.mock.js — Katepramax
// Datos de prueba para desarrollo frontend - Sede Cartagena
// Cuando el backend esté listo, estos se reemplazan por
// llamadas reales a la API en los services correspondientes
// ============================================================

// ─── Usuarios ────────────────────────────────────────────────
export const USUARIOS_MOCK = [
    {
      id: 3,
      nombreCompleto: "Andrés Pérez",
      usuario: "bodega_cta",
      contrasena: "bodega123",
      rol: "Bodega",
      sedeId: 2,
      sede: "Cartagena",
      esBogota: false,
    },
    {
      id: 6,
      nombreCompleto: "Miguel Ángel Ruiz",
      usuario: "entregador2",
      contrasena: "entrega123",
      rol: "Entregador",
      sedeId: 2,
      sede: "Cartagena",
      esBogota: false,
    },
];

// ─── Sedes ────────────────────────────────────────────────────
export const SEDES_MOCK = [
  { id: 1, nombre: "Bogotá",        esPrincipal: true  },
  { id: 2, nombre: "Cartagena",     esPrincipal: false },
  { id: 3, nombre: "Villavicencio", esPrincipal: false },
];

// ─── Productos ────────────────────────────────────────────────
export const PRODUCTOS_MOCK = [
  {
    id: 10,
    codigo: "ARR-010",
    nombre: "Arroz Costeño x 500g",
    departamento: "Granos", 
    precioLlegada: 1700,
    precioDetal: 2600,
    precioMayoreo: 2200,
    existencia: 180,
    sedeId: 2,
  },
  {
    id: 11,
    codigo: "ACE-011",
    nombre: "Aceite de Coco x 500ml",
    departamento: "Aceites",
    precioLlegada: 6500,
    precioDetal: 9000,
    precioMayoreo: 7800,
    existencia: 40,
    sedeId: 2,
  },
  {
    id: 12,
    codigo: "AZU-012",
    nombre: "Azúcar Morena x 1kg",
    departamento: "Granos",
    precioLlegada: 3000,
    precioDetal: 4500,
    precioMayoreo: 3900,
    existencia: 25,
    sedeId: 2,
  },
];

// ─── Pedidos ──────────────────────────────────────────────────
export const PEDIDOS_MOCK = [
  {
    id: 4,
    codigo: "KP-0044",
    cliente: "Tienda La Frontera",
    direccion: "Cll 60 #9-45, Cartagena",
    sede: "Cartagena",
    sedeId: 2,
    estado: "pendiente",
    entregador: null,
    total: 200000,
    creadoEn: "2025-05-11T10:00:00",
    items: [
      { nombre: "Arroz Costeño x 500g",   cantidad: 30, precio: 2600 },
      { nombre: "Aceite de Coco x 500ml", cantidad: 10, precio: 9000 },
    ],
  },
  {
    id: 5,
    codigo: "KP-0045",
    cliente: "Supermercado Marino",
    direccion: "Av San Felipe #12-34, Cartagena",
    sede: "Cartagena",
    sedeId: 2,
    estado: "entregado",
    entregador: "Miguel Ángel Ruiz",
    total: 150000,
    creadoEn: "2025-05-11T08:00:00",
    items: [
      { nombre: "Arroz Costeño x 500g",   cantidad: 20, precio: 2600 },
      { nombre: "Azúcar Morena x 1kg",    cantidad: 15, precio: 4500 },
    ],
  },
  {
    id: 6,
    codigo: "KP-0046",
    cliente: "Minimercado del Mar",
    direccion: "Cll 30 #5-12, Cartagena",
    sede: "Cartagena",
    sedeId: 2,
    estado: "en_ruta",
    entregador: "Miguel Ángel Ruiz",
    total: 180000,
    creadoEn: "2025-05-11T09:30:00",
    items: [
      { nombre: "Aceite de Coco x 500ml", cantidad: 15, precio: 9000 },
      { nombre: "Arroz Costeño x 500g",   cantidad: 10, precio: 2600 },
    ],
  },
];

// ─── Entregas ─────────────────────────────────────────────────
export const ENTREGAS_MOCK = [
  {
    id: 4,
    pedidoId: 5,
    codigo: "KP-0045",
    cliente: "Supermercado Marino",
    direccion: "Av San Felipe #12-34, Cartagena",
    entregador: "Miguel Ángel Ruiz",
    entregadorId: 6,
    estado: "entregado",
    montoCobrado: 150000,
    formaPago: "efectivo",
    salidaEn: "2025-05-11T08:15:00",
    confirmadoEn: "2025-05-11T09:00:00",
    foto: "https://placehold.co/400x300/1f1f22/e9c349?text=Evidencia",
    nota: null,
  },
  {
    id: 5,
    pedidoId: 6,
    codigo: "KP-0046",
    cliente: "Minimercado del Mar",
    direccion: "Cll 30 #5-12, Cartagena",
    entregador: "Miguel Ángel Ruiz",
    entregadorId: 6,
    estado: "en_ruta",
    montoCobrado: null,
    formaPago: null,
    salidaEn: "2025-05-11T09:45:00",
    confirmadoEn: null,
    foto: null,
    nota: null,
  },
];

// ─── Distribuciones ───────────────────────────────────────────
export const DISTRIBUCIONES_MOCK = [
  {
    id: 1,
    codigo: "DIST-001",
    sedeOrigen: "Bogotá",
    sedeDestino: "Cartagena",
    sedeDestinoId: 2,
    estado: "pendiente",
    creadoEn: "2025-05-11T07:00:00",
    items: [
      { nombre: "Arroz Costeño x 500g",   cantidad: 50 },
      { nombre: "Aceite de Coco x 500ml", cantidad: 20 },
    ],
    observaciones: null,
  },
  {
    id: 2,
    codigo: "DIST-002",
    sedeOrigen: "Bogotá",
    sedeDestino: "Villavicencio",
    sedeDestinoId: 3,
    estado: "recibido",
    creadoEn: "2025-05-10T14:00:00",
    items: [
      { nombre: "Azúcar Morena x 1kg", cantidad: 100 },
      { nombre: "Sal Refisal x 1kg",     cantidad: 30  },
    ],
    observaciones: null,
  },
];

// ─── Contabilidad ─────────────────────────────────────────────
export const CONTABILIDAD_MOCK = [
  {
    id: 2,
    fecha: "2025-05-11",
    sedeId: 2,
    sede: "Cartagena",
    efectivo: 530000,
    transferencias: 210000,
    egresos: 80000,
    saldoCartera: 150000,
    variacionCartera: -20000,
  },
];

// ─── KPIs Dashboard ───────────────────────────────────────────
export const KPI_MOCK = {
  ventasHoy: 150000,   // solo el pedido entregado hoy
  ventasAyer: 120000,  // ejemplo de ayer
  pedidosPendientes: 1, // solo KP-0044 pendiente
  entregasEnRuta: 1,    // solo KP-0046 en ruta
  alertasInventario: 2, // productos con stock bajo (ejemplo: Aceite de Coco y Azúcar Morena)
  totalSedes: 3,
};

// ─── Audit Log ────────────────────────────────────────────────
export const AUDIT_LOG_MOCK = [
  {
    id: 4,
    usuario: "Andrés Pérez",
    rol: "Bodega",
    sede: "Cartagena",
    accion: "Confirmó distribución DIST-001 como Incompleto",
    modulo: "Distribución",
    fecha: "2025-05-10T16:30:00",
    ip: "192.168.2.14",
  },
  {
    id: 6,
    usuario: "Miguel Ángel Ruiz",
    rol: "Entregador",
    sede: "Cartagena",
    accion: "Confirmó entrega KP-0045",
    modulo: "Entregas",
    fecha: "2025-05-11T09:00:00",
    ip: "192.168.2.25",
  },
];

// ─── Helpers de formato ───────────────────────────────────────
/**
 * Formatea un número como peso colombiano
 * Ejemplo: 1270000 → "$1.270.000"
 */
export const formatearPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(valor);

/**
 * Formatea una fecha ISO a texto legible
 * Ejemplo: "2025-05-11T09:10:00" → "11 may 2025, 9:10 a.m."
 */
export const formatearFecha = (iso) =>
  new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/**
 * Configuración de colores y etiquetas por estado
 */
export const CONFIG_ESTADO = {
  pendiente:  { label: "Pendiente",  color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
  en_ruta:    { label: "En ruta",    color: "#ddb7ff", bg: "rgba(221,183,255,0.12)", border: "rgba(221,183,255,0.3)" },
  entregado:  { label: "Entregado",  color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  fallido:    { label: "Fallido",    color: "#ffb4ab", bg: "rgba(255,180,171,0.12)", border: "rgba(255,180,171,0.3)" },
  asignado:   { label: "Asignado",   color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.3)"  },
  recibido:   { label: "Recibido",   color: "#4ade80", bg: "rgba(74,222,128,0.12)",  border: "rgba(74,222,128,0.3)"  },
  incompleto: { label: "Incompleto", color: "#e9c349", bg: "rgba(233,195,73,0.12)",  border: "rgba(233,195,73,0.3)"  },
};