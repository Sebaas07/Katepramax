import "./EmptyState.css";

const EmptyState = ({ icono, titulo, detalle, children }) => {
  return (
    <div className="rep-empty">
      <span className="material-symbols-outlined">{icono}</span>
      <div className="rep-empty__titulo">{titulo}</div>
      {detalle && <div className="rep-empty__detalle">{detalle}</div>}
      {children}
    </div>
  );
};

export default EmptyState;
