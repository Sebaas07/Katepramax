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
export const obtenerUsuario = () => obtenerSesion();

export const tieneAccesoTotal = () => obtenerSesion()?.rol === "Admin";

export const esRolBodega = () => {
  const rol = obtenerSesion()?.rol;
  return rol === "Bodega" || rol === "AdminBogota";
};

export const esRolEntregador = () => obtenerSesion()?.rol === "Entregador";

export const esRolAdmin = () => obtenerSesion()?.rol === "Admin";

// ── Sede ──────────────────────────────────────────────────────
export const obtenerSedeUsuario = () => obtenerSesion()?.sedeId ?? null;

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

  // Admin puede pasar sedeId como filtro opcional desde la UI
  if (usuario.rol === "Admin") return { ...filtrosBase };

  // Bodega y AdminBogota: sedeId forzado, ignorar cualquier sedeId del formulario
  if (usuario.rol === "Bodega" || usuario.rol === "AdminBogota") {
    const { sedeId: _ignorar, ...restoFiltros } = filtrosBase;
    return { ...restoFiltros, sedeId: usuario.sedeId };
  }

  return filtrosBase;
};

/**
 * Verifica si el usuario puede ver datos de una sede específica.
 * @param {number} sedeIdDestino
 * @returns {boolean}
 */
export const puedeVerSede = (sedeIdDestino) => {
  const usuario = obtenerSesion();
  if (!usuario) return false;
  if (usuario.rol === "Admin") return true;
  return Number(usuario.sedeId) === Number(sedeIdDestino);
};
