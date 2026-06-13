import { memo } from "react";
import { formatCOP } from "@/utils/formatters";

export const Spinner = memo(({ texto = "Cargando..." }) => (
  <div className="cont-spinner-wrap">
    <div className="cont-spinner" />
    <span>{texto}</span>
  </div>
);

// ── Empty state ───────────────────────────────────────────────
export const EmptyState = memo(({ icono, titulo, detalle }) => (
  <div className="cont-empty">
    <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
    <p>{titulo}</p>
    {detalle && <span className="cont-empty__hint">{detalle}</span>}
  </div>
));

export const TarjetaResumen = memo(({ titulo, icono, color, filas, total }) => (
  <div className="cont-resumen-card" style={{ "--card-accent": color }}>
    <div className="cont-resumen-card__header">
      <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
      <h4>{titulo}</h4>
    </div>
    <div className="cont-resumen-card__filas">
      {filas.map((f, i) => (
        <div key={`${f.sede}-${i}`} className="cont-resumen-card__fila">
          <span>{f.sede}</span>
          <strong>{formatCOP(f.valor)}</strong>
        </div>
      ))}
    </div>
    <div className="cont-resumen-card__total">
      <span>Total semana</span>
      <span>{formatCOP(total)}</span>
    </div>
  </div>
));

export const TarjetaResumenProveedor = memo(({ titulo, icono, color, filas, total }) => (
  <div className="cont-resumen-card" style={{ "--card-accent": color }}>
    <div className="cont-resumen-card__header">
      <span className="material-symbols-outlined" aria-hidden="true">{icono}</span>
      <h4>{titulo}</h4>
    </div>
    <div className="cont-resumen-card__filas">
      {filas.slice(0, 4).map((f, i) => (
        <div key={`prov-${f.sede}-${i}`} className="cont-resumen-card__fila">
          <span>{f.sede}</span>
          <strong>{formatCOP(f.valor)}</strong>
        </div>
      ))}
      {filas.length > 4 && (
        <div className="cont-resumen-card__fila cont-resumen-card__fila--more" style={{ background: "var(--surface-container)", padding: "0.375rem 0.5rem", borderRadius: "var(--radius-sm)" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>+{filas.length - 4} proveedores más</span>
          <span />
        </div>
      )}
    </div>
    <div className="cont-resumen-card__total">
      <span>Total semana</span>
      <span>{formatCOP(total)}</span>
    </div>
  </div>
));

export const DeudaBadge = memo(({ estado }) => {
  const cfg = ESTADOS_DEUDA[estado] ?? ESTADOS_DEUDA.pendiente;
  return (
    <span
      className="cont-estado-badge"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
});

export const DeudaBadge = ({ estado }) => {
  const cfg = ESTADOS_DEUDA[estado] ?? ESTADOS_DEUDA.pendiente;
  return (
    <span
      className="cont-estado-badge"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      {cfg.label}
    </span>
  );
};
