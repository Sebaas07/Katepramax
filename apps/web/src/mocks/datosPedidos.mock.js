// ============================================================
// datosPedidos.mock.js — Katepramax
// Datos de prueba para desarrollo frontend - Módulo de Pedidos
// Cuando el backend esté listo, estos se reemplazan por
// llamadas reales a la API en los services correspondientes
// ============================================================

// ─── Pedidos ────────────────────────────────────────────────
export const PEDIDOS_MOCK = [
  {
    id: 1,
    codigo: "KP-0001",
    cliente: "Tienda Don Jorge",
    direccion: "Cra 15 #45-20, Bogotá",
    sedeId: 1,
    sede: "Bogotá",
    estado: "pendiente",
    entregadorId: null,
    entregador: null,
    total: 125000,
    fechaCreacion: "2025-05-11T07:30:00",
    fechaActualizacion: "2025-05-11T07:30:00",
    items: [
      {
        productoId: 1,
        productoNombre: "Arroz Diana x 500g",
        cantidad: 30,
        precioUnitario: 2800,
        subtotal: 84000
      },
      {
        productoId: 2,
        productoNombre: "Aceite Girasol x 1L",
        cantidad: 10,
        precioUnitario: 10500,
        subtotal: 105000
      }
    ]
  },
  {
    id: 2,
    codigo: "KP-0002",
    cliente: "Supermercado El Ahorro",
    direccion: "Av Caracas #33-10, Bogotá",
    sedeId: 1,
    sede: "Bogotá",
    estado: "confirmado",
    entregadorId: 5,
    entregador: "Juan Torres",
    total: 89000,
    fechaCreacion: "2025-05-11T08:15:00",
    fechaActualizacion: "2025-05-11T09:00:00",
    items: [
      {
        productoId: 3,
        productoNombre: "Leche Alquería x 1L",
        cantidad: 25,
        precioUnitario: 3200,
        subtotal: 80000
      },
      {
        productoId: 6,
        productoNombre: "Azúcar Blanca x 1kg",
        cantidad: 5,
        precioUnitario: 2600,
        subtotal: 13000
      }
    ]
  },
  {
    id: 3,
    codigo: "KP-0003",
    cliente: "Restaurant El Sabor",
    direccion: "Cl 20 #15-40, Cartagena",
    sedeId: 2,
    sede: "Cartagena",
    estado: "en_ruta",
    entregadorId: 5,
    entregador: "Juan Torres",
    total: 210000,
    fechaCreacion: "2025-05-11T06:45:00",
    fechaActualizacion: "2025-05-11T07:00:00",
    items: [
      {
        productoId: 1,
        productoNombre: "Arroz Diana x 500g",
        cantidad: 50,
        precioUnitario: 2800,
        subtotal: 140000
      },
      {
        productoId: 4,
        productoNombre: "Huevos x 30 unidades",
        cantidad: 10,
        precioUnitario: 11000,
        subtotal: 110000
      }
    ]
  },
  {
    id: 4,
    codigo: "KP-0004",
    cliente: "Abarrotes La Esquina",
    direccion: "Cra 7 #12-30, Villavicencio",
    sedeId: 3,
    sede: "Villavicencio",
    estado: "entregado",
    entregadorId: 6,
    entregador: "Miguel Ángel Ruiz",
    total: 75000,
    fechaCreacion: "2025-05-11T05:30:00",
    fechaActualizacion: "2025-05-11T06:45:00",
    items: [
      {
        productoId: 5,
        productoNombre: "Panela Redonda x 250g",
        cantidad: 25,
        precioUnitario: 1800,
        subtotal: 45000
      },
      {
        productoId: 7,
        productoNombre: "Frijoles Negros x 1kg",
        cantidad: 10,
        precioUnitario: 5600,
        subtotal: 56000
      }
    ]
  },
  {
    id: 5,
    codigo: "KP-0005",
    cliente: "Tienda La Frontera",
    direccion: "Cra 25 #8-15, Bogotá",
    sedeId: 1,
    sede: "Bogotá",
    estado: "fallido",
    entregadorId: null,
    entregador: null,
    total: 63000,
    fechaCreacion: "2025-05-11T04:20:00",
    fechaActualizacion: "2025-05-11T04:20:00",
    items: [
      {
        productoId: 8,
        productoNombre: "Leche de Coco x 400ml",
        cantidad: 20,
        precioUnitario: 3800,
        subtotal: 76000
      }
    ]
  }
];

// ─── Entregadores Disponibles ───────────────────────────────
export const ENTREGADORES_MOCK = [
  {
    id: 5,
    nombreCompleto: "Juan Torres",
    usuario: "juan_t",
    telefono: "3123456789",
    zona: "Norte",
    activo: true,
    disponible: true,
    pedidosHoy: 2
  },
  {
    id: 6,
    nombreCompleto: "Miguel Ángel Ruiz",
    usuario: "miguel_r",
    telefono: "3109876543",
    zona: "Sur",
    activo: true,
    disponible: true,
    pedidosHoy: 1
  },
  {
    id: 7,
    nombreCompleto: "Diego Castro",
    usuario: "diego_c",
    telefono: "3155551234",
    zona: "Centro",
    activo: true,
    disponible: true,
    pedidosHoy: 0
  }
];

// ─── Estados de Pedido (deberían coincidir con CONFIG_ESTADO global) ─────
export const ESTADO_PEDIDO = {
  pendiente: { label: "Pendiente", color: "#fbbf24", bg: "rgba(251,191,36,0.1)" },
  confirmado: { label: "Confirmado", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  en_ruta: { label: "En ruta", color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  entregado: { label: "Entregado", color: "#10b981", bg: "rgba(16,185,129,0.1)" },
  fallido: { label: "Fallido", color: "#ef4444", bg: "rgba(236,68,64,0.1)" }
};