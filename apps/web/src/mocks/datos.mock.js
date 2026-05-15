// ============================================================
// datos.mock.js — Katepramax
// Datos de prueba para desarrollo frontend
// Cuando el backend esté listo, estos se reemplazan por
// llamadas reales a la API en los services correspondientes
// ============================================================

// ─── Usuarios ────────────────────────────────────────────────
export const USUARIOS_MOCK = [
   {
     id: 1,
     nombreCompleto: "Carlos Mendoza",
     usuario: "admin",
     clave: "admin123",
     rol: "Admin",
     sedeId: 1,
     sede: "Bogotá",
     esBogota: false,
   },
{
     id: 2,
     nombreCompleto: "Laura Jiménez",
     usuario: "bodega_bog",
     clave: "bodega123",
     rol: "Bodega",
     sedeId: 1,
     sede: "Bogotá",
     esBogota: true,
   },
{
     id: 3,
     nombreCompleto: "Andrés Pérez",
     usuario: "bodega_cta",
     clave: "bodega123",
     rol: "Bodega",
     sedeId: 2,
     sede: "Cartagena",
     esBogota: false,
   },
{
     id: 4,
     nombreCompleto: "Sofía Ramírez",
     usuario: "bodega_vll",
     clave: "bodega123",
     rol: "Bodega",
     sedeId: 3,
     sede: "Villavicencio",
     esBogota: false,
   },
{
     id: 5,
     nombreCompleto: "Juan Torres",
     usuario: "entregador1",
     clave: "entrega123",
     rol: "Entregador",
     sedeId: 1,
     sede: "Bogotá",
     esBogota: false,
   },
{
     id: 6,
     nombreCompleto: "Miguel Ángel Ruiz",
     usuario: "entregador2",
     clave: "entrega123",
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
    id: 1,
    codigo: "ARR-001",
    nombre: "Arroz Diana x 500g",
    departamento: "Granos", 
    precioLlegada: 1800,
    precioDetal: 2800,
    precioMayoreo: 2400,
    existencia: 240,
    sedeId: 1,
  },
  {
    id: 2,
    codigo: "ACE-002",
    nombre: "Aceite Girasol x 1L",
    departamento: "Aceites",
    precioLlegada: 7500,
    precioDetal: 10500,
    precioMayoreo: 9200,
    existencia: 85,
    sedeId: 1,
  },
  {
    id: 3,
    codigo: "AZU-003",
    nombre: "Azúcar Riopaila x 1kg",
    departamento: "Granos",
    precioLlegada: 3200,
    precioDetal: 4800,
    precioMayoreo: 4200,
    existencia: 12,
    sedeId: 1,
  },
  {
    id: 4,
    codigo: "PAN-004",
    nombre: "Panela Redonda x 250g",
    departamento: "Dulces",
    precioLlegada: 1200,
    precioDetal: 2000,
    precioMayoreo: 1700,
    existencia: 310,
    sedeId: 1,
  },
  {
    id: 5,
    codigo: "SAL-005",
    nombre: "Sal Refisal x 1kg",
    departamento: "Condimentos",
    precioLlegada: 900,
    precioDetal: 1600,
    precioMayoreo: 1350,
    existencia: 8,
    sedeId: 1,
  },
  {
    id: 6,
    codigo: "LEH-006",
    nombre: "Leche Alquería x 1L",
    departamento: "Lácteos",
    precioLlegada: 2800,
    precioDetal: 3900,
    precioMayoreo: 3400,
    existencia: 60,
    sedeId: 1,
  },
];

// ─── Pedidos ──────────────────────────────────────────────────
export const PEDIDOS_MOCK = [
  {
    id: 1,
    codigo: "KP-0041",
    cliente: "Tienda Don Jorge",
    direccion: "Cra 15 #45-20, Bogotá",
    sede: "Bogotá",
    sedeId: 1,
    estado: "en_ruta",
    entregador: "Juan Torres",
    total: 85000,
    creadoEn: "2025-05-11T08:30:00",
    items: [
      { nombre: "Arroz Diana x 500g",   cantidad: 10, precio: 2800 },
      { nombre: "Aceite Girasol x 1L",  cantidad: 5,  precio: 10500 },
    ],
  },
  {
    id: 2,
    codigo: "KP-0042",
    cliente: "Minimercado La Esquina",
    direccion: "Cll 80 #22-15, Bogotá",
    sede: "Bogotá",
    sedeId: 1,
    estado: "pendiente",
    entregador: null,
    total: 120000,
    creadoEn: "2025-05-11T09:10:00",
    items: [
      { nombre: "Azúcar Riopaila x 1kg", cantidad: 15, precio: 4800 },
      { nombre: "Panela Redonda x 250g", cantidad: 20, precio: 2000 },
    ],
  },
  {
    id: 3,
    codigo: "KP-0043",
    cliente: "Supermercado El Ahorro",
    direccion: "Av Caracas #33-10, Bogotá",
    sede: "Bogotá",
    sedeId: 1,
    estado: "entregado",
    entregador: "Juan Torres",
    total: 45000,
    creadoEn: "2025-05-11T07:00:00",
    items: [
      { nombre: "Sal Refisal x 1kg",   cantidad: 10, precio: 1600 },
      { nombre: "Leche Alquería x 1L", cantidad: 10, precio: 2900 },
    ],
  },
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
      { nombre: "Arroz Diana x 500g",  cantidad: 30, precio: 2800 },
      { nombre: "Aceite Girasol x 1L", cantidad: 10, precio: 10500 },
    ],
  },
  {
    id: 5,
    codigo: "KP-0045",
    cliente: "Abarrotes El Centro",
    direccion: "Cra 7 #12-30, Villavicencio",
    sede: "Villavicencio",
    sedeId: 3,
    estado: "fallido",
    entregador: "Miguel Ángel Ruiz",
    total: 67000,
    creadoEn: "2025-05-11T06:45:00",
    items: [
      { nombre: "Panela Redonda x 250g", cantidad: 20, precio: 2000 },
      { nombre: "Leche Alquería x 1L",  cantidad: 9,  precio: 3900 },
    ],
  },
];

// ─── Entregas ─────────────────────────────────────────────────
export const ENTREGAS_MOCK = [
  {
    id: 1,
    pedidoId: 1,
    codigo: "KP-0041",
    cliente: "Tienda Don Jorge",
    direccion: "Cra 15 #45-20, Bogotá",
    entregador: "Juan Torres",
    entregadorId: 5,
    estado: "en_ruta",
    montoCobrado: null,
    formaPago: null,
    salidaEn: "2025-05-11T09:00:00",
    confirmadoEn: null,
    foto: null,
    nota: null,
  },
  {
    id: 2,
    pedidoId: 3,
    codigo: "KP-0043",
    cliente: "Supermercado El Ahorro",
    direccion: "Av Caracas #33-10, Bogotá",
    entregador: "Juan Torres",
    entregadorId: 5,
    estado: "entregado",
    montoCobrado: 45000,
    formaPago: "efectivo",
    salidaEn: "2025-05-11T07:15:00",
    confirmadoEn: "2025-05-11T08:10:00",
    foto: "https://placehold.co/400x300/1f1f22/e9c349?text=Evidencia",
    nota: null,
  },
  {
    id: 3,
    pedidoId: 5,
    codigo: "KP-0045",
    cliente: "Abarrotes El Centro",
    direccion: "Cra 7 #12-30, Villavicencio",
    entregador: "Miguel Ángel Ruiz",
    entregadorId: 6,
    estado: "fallido",
    montoCobrado: null,
    formaPago: null,
    salidaEn: "2025-05-11T07:00:00",
    confirmadoEn: null,
    foto: null,
    nota: "Cliente no se encontraba en el lugar",
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
      { nombre: "Arroz Diana x 500g",   cantidad: 50 },
      { nombre: "Aceite Girasol x 1L",  cantidad: 20 },
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
      { nombre: "Panela Redonda x 250g", cantidad: 100 },
      { nombre: "Sal Refisal x 1kg",     cantidad: 30  },
    ],
    observaciones: null,
  },
  {
    id: 3,
    codigo: "DIST-003",
    sedeOrigen: "Bogotá",
    sedeDestino: "Cartagena",
    sedeDestinoId: 2,
    estado: "incompleto",
    creadoEn: "2025-05-10T10:00:00",
    items: [
      { nombre: "Leche Alquería x 1L", cantidad: 40 },
      { nombre: "Azúcar Riopaila x 1kg", cantidad: 25 },
    ],
    observaciones: "Llegaron 30 unidades de leche, faltaron 10. Azúcar completa.",
  },
];

// ─── Contabilidad ─────────────────────────────────────────────
export const CONTABILIDAD_MOCK = [
  {
    id: 1,
    fecha: "2025-05-11",
    sedeId: 1,
    sede: "Bogotá",
    efectivo: 850000,
    transferencias: 420000,
    egresos: 120000,
    saldoCartera: 380000,
    variacionCartera: 45000,
  },
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
  {
    id: 3,
    fecha: "2025-05-11",
    sedeId: 3,
    sede: "Villavicencio",
    efectivo: 310000,
    transferencias: 180000,
    egresos: 45000,
    saldoCartera: 95000,
    variacionCartera: 12000,
  },
];

// ─── KPIs Dashboard ───────────────────────────────────────────
export const KPI_MOCK = {
  ventasHoy: 1270000,
  ventasAyer: 1135000,
  pedidosPendientes: 142,
  entregasEnRuta: 28,
  alertasInventario: 3,      // productos con stock bajo
  totalSedes: 3,
};

// ─── Audit Log ────────────────────────────────────────────────
export const AUDIT_LOG_MOCK = [
  {
    id: 1,
    usuario: "Laura Jiménez",
    rol: "Bodega",
    sede: "Bogotá",
    accion: "Creó pedido KP-0042",
    modulo: "Pedidos",
    fecha: "2025-05-11T09:10:00",
    ip: "192.168.1.10",
  },
  {
    id: 2,
    usuario: "Juan Torres",
    rol: "Entregador",
    sede: "Bogotá",
    accion: "Confirmó entrega KP-0043",
    modulo: "Entregas",
    fecha: "2025-05-11T08:10:00",
    ip: "192.168.1.25",
  },
  {
    id: 3,
    usuario: "Carlos Mendoza",
    rol: "Admin",
    sede: "Bogotá",
    accion: "Modificó precio de Arroz Diana x 500g",
    modulo: "Productos",
    fecha: "2025-05-11T07:45:00",
    ip: "192.168.1.5",
  },
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
    id: 5,
    usuario: "Carlos Mendoza",
    rol: "Admin",
    sede: "Bogotá",
    accion: "Creó usuario bodega_vll",
    modulo: "Usuarios",
    fecha: "2025-05-10T11:00:00",
    ip: "192.168.1.5",
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