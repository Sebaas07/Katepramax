/**
 * permisos.js — Katepramax
 *
 * Helpers de permisos y filtro de sede para el frontend.
 * Esta es la fuente única de verdad para decidir qué ve cada rol.
 *
 * Reglas:
 *   Admin          → acceso total, puede filtrar por cualquier sede
 *   Bodega/AdminBogota → solo su propia sede, sin excepción
 *   Entregador     → solo sus entregas asignadas
 */

import { obtenerSesion } from "@/utils/sessionHelper";

// ── Helpers de rol ────────────────────────────────────────────
// Sin export — no se importan en ningún módulo actualmente
const obtenerUsuario = () => obtenerSesion();
const esRolBodega = () => {
  const r = obtenerSesion()?.rol;
  return r === "Bodega" || r === "AdminBogota";
};
const esRolEntregador = () => obtenerSesion()?.rol === "Entregador";
const esRolAdmin = () => obtenerSesion()?.rol === "Admin";

export const tieneAccesoTotal = () => obtenerSesion()?.rol === "Admin";

// ── Sede ──────────────────────────────────────────────────────
// Retorna la sede "operativa" del usuario para consultas scoped por sede.
// Para un Bodega y para un Oficinista cuya oficina se alimenta de una bodega,
// la sede operativa es la bodega (bodegaId), porque ahí se registra el
// inventario/stock. Admin/AdminBogota usan su propia sede.
export const obtenerSedeUsuario = () => {
  const usuario = obtenerSesion();
  if (!usuario) return null;
  if (usuario.rol === "Bodega" || usuario.rol === "Oficinista") {
    return usuario.bodegaId ?? usuario.sedeId ?? null;
  }
  return usuario.sedeId ?? null;
};

/**
 * Construye un objeto de filtros con sedeId forzado si el usuario
 * no es Admin. Llama a este helper en CADA petición que lea datos
 * con scope de sede para garantizar que Bodega/AdminBogota
 * nunca vea datos de otra sede.
 *
 * @param {object} filtrosBase - Filtros adicionales de la petición
 * @returns {object} Filtros finales con sedeId inyectado si aplica
 */
export const filtrarPorSede = (filtrosBase = {}) => {
  const usuario = obtenerSesion();
  if (!usuario) return filtrosBase;

  if (usuario.rol === "Admin") return { ...filtrosBase };

  if (usuario.rol === "Bodega" || usuario.rol === "AdminBogota") {
    const { sedeId: _ignorar, ...restoFiltros } = filtrosBase;
    return { ...restoFiltros, sedeId: usuario.sedeId };
  }

  return filtrosBase;
};

/**
 * Verifica si el usuario puede ver datos de una sede específica.
 * Sin export — no se importa en ningún módulo actualmente.
 * @param {number} sedeIdDestino
 * @returns {boolean}
 */
const puedeVerSede = (sedeIdDestino) => {
  const usuario = obtenerSesion();
  if (!usuario) return false;
  if (usuario.rol === "Admin") return true;
  return Number(usuario.sedeId) === Number(sedeIdDestino);
};
