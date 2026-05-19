// ============================================================
// datosVillavicencio.mock.js — Katepramax
// Datos de prueba para desarrollo frontend - Sede Villavicencio
// Cuando el backend esté listo, estos se reemplazan por
// llamadas reales a la API en los services correspondientes
// ============================================================

// ─── Usuarios ────────────────────────────────────────────────
export const USUARIOS_MOCK = [
     {
       id: 4,
       nombreCompleto: "Sofía Ramírez",
        usuario: "bodega_vll",
        contrasena: "bodega123",
       rol: "Bodega",
       sedeId: 3,
       sede: "Villavicencio",
       esBogota: false,
     },
     {
       id: 7,
       nombreCompleto: "Diego Castro",
        usuario: "entregador3",
        contrasena: "entrega123",
       rol: "Entregador",
       sedeId: 3,
       sede: "Villavicencio",
       esBogota: false,
     },
 ];

// ─── Pedidos ─────────────────────────────────────────────────
export const PEDIDOS_MOCK = [
   {
     id: 6,
     codigo: "KP-0046",
     cliente: "Supermercado Los Llanos",
     direccion: "Cra 10 #25-15, Villavicencio",
     sede: "Villavicencio",
     sedeId: 3,
     estado: "pendiente",
     entregador: null,
     total: 340000,
     creadoEn: "2025-05-11T11:30:00",
     items: [
       { nombre: "Harina de Trigo x 1kg", cantidad: 25, precio: 3200 },
       { nombre: "Azúcar Blanca x 1kg", cantidad: 20, precio: 2800 },
     ],
   },
   {
     id: 7,
     codigo: "KP-0047",
     cliente: "Panadería El Buen Sabor",
     direccion: "Cra 15 #30-10, Villavicencio",
     sede: "Villavicencio",
     sedeId: 3,
     estado: "confirmado",
     entregador: null,
     total: 180000,
     creadoEn: "2025-05-11T10:15:00",
     items: [
       { nombre: "Leche Entera x 1L", cantidad: 15, precio: 3500 },
       { nombre: "Huevos x 30 unidades", cantidad: 10, precio: 12000 },
     ],
   },
   {
     id: 8,
     codigo: "KP-0048",
     cliente: "Restaurant Doña Mary",
     direccion: "Av 40 #15-20, Villavicencio",
     sede: "Villavicencio",
     sedeId: 3,
     estado: "pendiente",
     entregador: null,
     total: 420000,
     creadoEn: "2025-05-11T09:45:00",
     items: [
       { nombre: "Aceite de Palma x 1L", cantidad: 12, precio: 8500 },
       { nombre: "Leche de Coco x 400ml", cantidad: 25, precio: 4200 },
     ],
   },
   {
     id: 9,
     codigo: "KP-0049",
     cliente: "MiniMarket El Sol",
     direccion: "Cra 5 #12-05, Villavicencio",
     sede: "Villavicencio",
     sedeId: 3,
     estado: "en_camino",
     entregador: "Diego Castro",
     total: 95000,
     creadoEn: "2025-05-11T08:30:00",
     items: [
       { nombre: "Pan Integral x unidades", cantidad: 40, precio: 1800 },
       { nombre: "Mermelada de Fresa x 250g", cantidad: 15, precio: 5200 },
     ],
   },
   {
     id: 10,
     codigo: "KP-0050",
     cliente: "Abarrotes La Esquina",
     direccion: "Cra 20 #8-30, Villavicencio",
     sede: "Villavicencio",
     sedeId: 3,
     estado: "pendiente",
     entregador: null,
     total: 275000,
     creadoEn: "2025-05-11T07:20:00",
     items: [
       { nombre: "Arroz Integral x 500g", cantidad: 30, precio: 4200 },
       { nombre: "Frijoles Negros x 1kg", cantidad: 15, precio: 5800 },
     ],
   },
 ];

// ─── Estados de Pedido ───────────────────────────────────────
export const CONFIG_ESTADO = {
   pendiente: { label: "Pendiente", color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "#fbbf24" },
   confirmado: { label: "Confirmado", color: "#3b82f6", bg: "rgba(59,130,246,0.1)", border: "#3b82f6" },
   en_camino: { label: "En camino", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "#8b5cf6" },
   entregado: { label: "Entregado", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "#10b981" },
   fallido: { label: "Fallido", color: "#ef4444", bg: "rgba(236,68,64,0.1)", border: "#ef4444" },
 };

// ─── KPIs Dashboard ───────────────────────────────────────────
export const KPI_MOCK = {
   ventasHoy: 980000,
   ventasAyer: 890000,
   pedidosPendientes: 87,
   entregasEnRuta: 19,
   alertasInventario: 7,      // productos con stock bajo
   totalSedes: 3,
 };

// ─── Helpers de formato ───────────────────────────────────────
/**
 * Formatea un número como peso colombiano
 * Ejemplo: 980000 → "$980.000"
 */
export const formatearPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(valor);