import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import { formatCOP, formatFecha } from "@/utils/formatters";
import { EmptyState } from "./ContabilidadUI";

const toNumber = (v) => Number(v ?? 0);

// Antes vivía en una página aparte ("Reportes"), pero esa sección solo
// tenía dos pestañas y "Gastos Diarios" ya estaba duplicada con la
// pestaña de Egresos de aquí. Se dejó únicamente lo que aportaba algo
// nuevo: el detalle de cobros por entregador.
const CobrosEntregadorTab = ({ cobros, fechaInicio, fechaFin }) => {
  const detalle = useMemo(() => cobros?.detalle ?? [], [cobros]);

  const chartData = useMemo(
    () =>
      detalle.map((c) => ({
        entregador: c.entregador,
        total: toNumber(c.total),
      })),
    [detalle],
  );

  if (detalle.length === 0) {
    return (
      <EmptyState
        icono="delivery_dining"
        titulo="Sin cobros registrados en este rango de fechas."
        detalle="Ajusta las fechas o verifica que existan entregas confirmadas."
      />
    );
  }

  return (
    <div className="cont-tab-body">
      <div className="cont-kpis">
        <div className="cont-kpi-card" style={{ "--kpi-color": "#4ade80" }}>
          <div className="cont-kpi-card__icon">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div className="cont-kpi-card__body">
            <div className="cont-kpi-card__titulo">Total cobrado</div>
            <div className="cont-kpi-card__valor">{formatCOP(cobros?.total ?? 0)}</div>
            <div className="cont-kpi-card__sub">
              {formatFecha(fechaInicio)} — {formatFecha(fechaFin)}
            </div>
          </div>
        </div>
        <div className="cont-kpi-card" style={{ "--kpi-color": "var(--primary)" }}>
          <div className="cont-kpi-card__icon">
            <span className="material-symbols-outlined">local_shipping</span>
          </div>
          <div className="cont-kpi-card__body">
            <div className="cont-kpi-card__titulo">Entregas confirmadas</div>
            <div className="cont-kpi-card__valor">{cobros?.pedidos ?? 0}</div>
          </div>
        </div>
        <div className="cont-kpi-card" style={{ "--kpi-color": "#fbbf24" }}>
          <div className="cont-kpi-card__icon">
            <span className="material-symbols-outlined">local_taxi</span>
          </div>
          <div className="cont-kpi-card__body">
            <div className="cont-kpi-card__titulo">Valor total domicilios</div>
            <div className="cont-kpi-card__valor">{formatCOP(cobros?.totalDomicilios ?? 0)}</div>
            <div className="cont-kpi-card__sub">
              A pagar a los entregadores por despachos
            </div>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="cont-section">
          <h3 className="cont-section__title">
            <span className="material-symbols-outlined">bar_chart</span>
            Cobros por entregador
          </h3>
          <div className="cont-chart-wrap" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                <XAxis dataKey="entregador" />
                <YAxis />
                <Tooltip formatter={(value) => formatCOP(value)} />
                <Legend />
                <Bar dataKey="total" name="Total cobrado" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="cont-tabla-wrap">
        <TablaGenerica
          columnas={[
            { campo: "entregador",    label: "Entregador",    tipo: "texto"  },
            { campo: "pedidos",       label: "Entregas",      tipo: "numero" },
            { campo: "total",         label: "Total cobrado", tipo: "moneda" },
            { campo: "efectivo",      label: "Efectivo",      tipo: "moneda" },
            { campo: "cuentas",       label: "Transferencia", tipo: "moneda" },
            { campo: "valorDomicilio", label: "Domicilios a pagar", tipo: "moneda" },
          ]}
          datos={detalle}
          mostrarBuscador
          buscarEnCampos={["entregador"]}
        />
      </div>
    </div>
  );
};

export default CobrosEntregadorTab;
