import "./ChartTooltip.css";

/**
 * ChartTooltip — contenido personalizado para <Tooltip> de recharts,
 * con el tema oscuro de la app. Uso:
 *   <Tooltip content={<ChartTooltip formato={formatCOP} />} />
 */
const ChartTooltip = ({ active, payload, label, formato }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      {label != null && label !== "" && (
        <div className="chart-tooltip__label">{label}</div>
      )}
      {payload.map((item) => (
        <div className="chart-tooltip__row" key={item.dataKey ?? item.name}>
          <span
            className="chart-tooltip__dot"
            style={{ background: item.color ?? item.fill }}
            aria-hidden="true"
          />
          <span className="chart-tooltip__name">{item.name}</span>
          <span className="chart-tooltip__valor">
            {formato ? formato(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ChartTooltip;