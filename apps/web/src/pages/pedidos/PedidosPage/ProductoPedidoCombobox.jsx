import { useMemo } from "react";

/**
 * Dropdown de productos para crear pedido.
 * Muestra [código] nombre + precio, y solo productos de la sede indicada
 * (si sedeIdFiltro viene definido).
 */
export default function ProductoPedidoCombobox({
  index,
  item,
  productos,
  sedeIdFiltro,
  nombreSede,
  abierto,
  onFocus,
  onBuscar,
  onLimpiar,
  onSeleccionar,
  onCerrar,
}) {
  const productosSede = useMemo(() => {
    if (sedeIdFiltro == null || sedeIdFiltro === "") return productos;
    const sid = Number(sedeIdFiltro);
    return productos.filter((p) => Number(p.sedeId ?? p.sede?.id) === sid);
  }, [productos, sedeIdFiltro]);

  const termino = (item.busqueda || "").trim().toLowerCase();
  const productosFiltrados = (
    termino
      ? productosSede.filter(
          (p) =>
            String(p.codigo).includes(termino) ||
            String(p.nombre ?? p.descripcion ?? "")
              .toLowerCase()
              .includes(termino),
        )
      : productosSede
  ).slice(0, 10);

  const formatPrecio = (p) =>
    `$${Number(p.precioVenta ?? p.precioDetal ?? 0).toLocaleString("es-CO")}`;

  return (
    <div className="item-field--producto ped-combobox">
      <label htmlFor={`ped-buscar-${index}`}>Producto</label>
      <div className="ped-combobox__input-wrap">
        <input
          id={`ped-buscar-${index}`}
          type="text"
          className="form-control"
          placeholder="Busca por código o nombre..."
          autoComplete="off"
          value={item.busqueda}
          onFocus={onFocus}
          onChange={(e) => onBuscar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCerrar();
          }}
          onBlur={() => {
            window.setTimeout(() => onCerrar(), 150);
          }}
        />
        {item.busqueda && (
          <button
            type="button"
            className="ped-combobox__clear"
            aria-label="Quitar producto seleccionado"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onLimpiar}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        )}
      </div>

      {abierto && (
        <div className="ped-combobox__dropdown">
          {productosFiltrados.length === 0 ? (
            <div className="ped-combobox__vacio">
              {sedeIdFiltro
                ? `Sin resultados en esta sede para “${item.busqueda || ""}”`
                : `Sin resultados para “${item.busqueda || ""}”`}
            </div>
          ) : (
            productosFiltrados.map((p) => (
              <button
                type="button"
                key={`${p.codigo}-${p.sedeId ?? p.sede?.id ?? ""}`}
                className="ped-combobox__opcion"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onSeleccionar(p)}
              >
                <span className="ped-combobox__opcion-nombre">
                  [{p.codigo}] {p.nombre ?? p.descripcion}
                </span>
                <span className="ped-combobox__opcion-meta">
                  <span className="ped-combobox__opcion-precio">
                    {formatPrecio(p)}
                  </span>
                  <span className="ped-combobox__opcion-sede">
                    {p.sede?.nombre ?? nombreSede(p.sedeId)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
