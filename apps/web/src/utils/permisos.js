import { obtenerSesion } from "@/utils/sessionHelper";

/**
 * Helpers de permisos y sede para el frontend
 * Reglas:
 * - Admin: acceso total (no filtra por sede)
 * - Bodega/AdminBogota: solo su sede
 * - Entregador: solo sus entregas asignadas
 */
export const tieneAccesoTotal = () => {
  const usuario = obtenerSesion();
  return usuario?.rol === "Admin";
};

export const obtenerSedeUsuario = () => {
  const usuario = obtenerSesion();
  return usuario?.sedeId ?? null;
};

export const filtrarPorSede = (filtros) => {
  const usuario = obtenerSesion();
  const sedeIdUsuario = usuario?.sedeId ?? null;

  if (!usuario || usuario.rol === "Admin" || !sedeIdUsuario) {
    return filtros;
  }

  return { ...filtros, sedeId: sedeIdUsuario };
};

export const esRolBodega = () => {
  const usuario = obtenerSesion();
  return usuario?.rol === "Bodega" || usuario?.rol === "AdminBogota";
};

export const esRolEntregador = () => {
  const usuario = obtenerSesion();
  return usuario?.rol === "Entregador";
};