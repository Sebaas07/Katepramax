import "./EmptyState.css";

/**
 * EmptyState — componente de estado vacío reutilizable.
 * Acepta dos conjuntos de props para compatibilidad:
 *   - icon / title / description / subDescription (API original)
 *   - icono / titulo / detalle (alias usados en páginas refactorizadas)
 */
const EmptyState = ({
  icon,
  title,
  description,
  subDescription,
  actionLabel,
  onAction,
  // Aliases
  icono,
  titulo,
  detalle,
}) => {
  const iconFinal = icon ?? icono;
  const titleFinal = title ?? titulo;
  const descFinal = description ?? detalle;

  return (
    <output className="empty-state-container">
      {iconFinal && (
        <span
          className="material-symbols-outlined empty-state-icon"
          aria-hidden="true"
        >
          {iconFinal}
        </span>
      )}
      {titleFinal && <h3 className="empty-state-title">{titleFinal}</h3>}
      {descFinal && <p className="empty-state-description">{descFinal}</p>}
      {subDescription && <p className="empty-state-sub">{subDescription}</p>}
      {actionLabel && onAction && (
        <button
          className="btn-outline empty-state-action"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </output>
  );
};

export default EmptyState;
