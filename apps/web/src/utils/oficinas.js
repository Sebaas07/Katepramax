// Utilidad para filtrar qué Oficinas ve un usuario en selectores de pedido.
//
//   - Admin       → todas las oficinas
//   - AdminBogota → solo oficinas de Bogotá (su sede)
//   - Oficinista  → solo oficinas de la ciudad de su sede
//
// Las sedes del backend traen `tipo` ("Bodega"/"Oficina") y `nombre`.
const cityToken = (nombre) => String(nombre ?? "").trim().split(/\s+/)[0].toLowerCase();

export const oficinasVisibles = (sedes, usuario) => {
  const oficinas = (sedes ?? []).filter((s) => s.tipo === "Oficina");
  const rol = usuario?.rol;

  if (rol === "Admin") return oficinas;

  if (rol === "AdminBogota")
    return oficinas.filter(
      (s) =>
        cityToken(s.nombre) === "bogotá" ||
        String(s.nombre).toLowerCase().includes("bogotá"),
    );

  if (rol === "Oficinista") {
    const miSede = oficinas.find((s) => Number(s.id) === Number(usuario.sedeId));
    if (miSede) {
      const ciudad = cityToken(miSede.nombre);
      return oficinas.filter((s) => cityToken(s.nombre) === ciudad);
    }
    // Sin oficina reconocible: su propia sede si es oficina
    const id = Number(usuario.sedeId ?? usuario.bodegaId);
    return oficinas.filter((s) => Number(s.id) === id);
  }

  return oficinas;
};