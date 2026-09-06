// Utilidad para filtrar qué Bodegas ve un usuario en selectores de producto
// e inventario.
//
//   - Admin        → todas las bodegas
//   - AdminBogota  → bodegas de Bogotá (el backend ya las acota)
//   - Bodega       → solo su propia bodega
//   - Oficinista   → todas las bodegas de la ciudad de su bodega
//
// Las sedes del backend traen `tipo` ("Bodega"/"Oficina"), `nombre` y `bodegaId`.
const cityToken = (nombre) => String(nombre ?? "").trim().split(/\s+/)[0].toLowerCase();

export const bodegasVisibles = (sedes, usuario) => {
  const bodegas = (sedes ?? []).filter((s) => s.tipo === "Bodega");
  const rol = usuario?.rol;

  if (rol === "Admin") return bodegas;

  if (rol === "AdminBogota")
    return bodegas.filter(
      (s) =>
        cityToken(s.nombre) === "bogotá" ||
        String(s.nombre).toLowerCase().includes("bogotá"),
    );

  if (rol === "Bodega") {
    const id = Number(usuario.bodegaId ?? usuario.sedeId);
    return bodegas.filter((s) => Number(s.id) === id);
  }

  if (rol === "Oficinista") {
    const miBodega = bodegas.find(
      (s) => Number(s.id) === Number(usuario.bodegaId),
    );
    if (miBodega) {
      const ciudad = cityToken(miBodega.nombre);
      return bodegas.filter((s) => cityToken(s.nombre) === ciudad);
    }
    // Sin bodega asignada: al menos su propia sede si es bodega
    const id = Number(usuario.bodegaId ?? usuario.sedeId);
    return bodegas.filter((s) => Number(s.id) === id);
  }

  return bodegas;
};
