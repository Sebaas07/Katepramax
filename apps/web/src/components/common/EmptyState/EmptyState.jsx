import "./EmptyState.css";

const EmptyState = ({ icon, title, description, subDescription, actionLabel, onAction }) => {
  return (
    <div className="empty-state-container">
      <span className="material-symbols-outlined empty-state-icon">{icon}</span>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {subDescription && <p className="empty-state-sub">{subDescription}</p>}
      {actionLabel && onAction && (
        <button className="btn-outline empty-state-action" onClick={onAction} type="button">
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;