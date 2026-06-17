import { useMemo, memo } from "react";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import { TarjetaResumen } from "./ContabilidadUI";

const COLUMNAS = [
  { campo: "fecha",        label: "Fecha",         tipo: "fecha"  },
  { campo: "semana",       label: "Sem.",           tipo: "texto"  },
  { campo: "sede",         label: "Sede",           tipo: "texto"  },
  { campo: "saldoDia",     label: "Saldo del Dia",  tipo: "moneda", resaltar: true },
  { campo: "saldoAnterior",label: "Saldo Anterior", tipo: "moneda" },
  { campo: "variacion",    label: "Variacion",      tipo: "moneda" },
];

const CarteraTab = memo(({ cartera, sedes, esAdmin, onEditar, onEliminar }) => {
  const resumenSedes = useMemo(() =>
    sedes.map((s) => {
      const regs = [...cartera]
        .filter((c) => c.sedeId === s.id)
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      return { sede: s.nombre, valor: regs[0]?.saldoDia ?? 0 };
    }), [cartera, sedes]);

  const totalCartera = useMemo(
    () => resumenSedes.reduce((s, r) => s + Number(r.valor ?? 0), 0),
    [resumenSedes]
  );

  const acciones = useMemo(() =>
    esAdmin
      ? (row) => [
          { label: "Editar",   icon: "edit",   onClick: () => onEditar(row, "cartera") },
          { label: "Eliminar", icon: "delete", variante: "danger", onClick: () => onEliminar(row, "cartera") },
        ]
      : undefined,
  [esAdmin, onEditar, onEliminar]);

  return (
    <>
      {cartera.length > 0 && (
        <div className="cont-resumen-row">
          <TarjetaResumen
            titulo="Cartera Actual por Sede"
            icono="account_balance"
            color="var(--primary)"
            filas={resumenSedes}
            total={totalCartera}
          />
        </div>
      )}
      <div className="cont-tabla-wrap">
        <TablaGenerica
          columnas={COLUMNAS}
          datos={cartera}
          filasPorPagina={10}
          mostrarBuscador
          buscarEnCampos={["sede"]}
          paginacion
          renderAcciones={acciones}
          renderCeldaCustom={(fila, col) => {
            if (col.campo === "variacion") {
              const num = Number(fila.variacion ?? (Number(fila.saldoDia ?? 0) - Number(fila.saldoAnterior ?? 0)));
              return (
                <span className={num >= 0 ? "cont-val-positivo" : "cont-val-negativo"}>
                  {num.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 })}
                </span>
              );
            }
            if (col.campo === "saldoDia" && col.resaltar) {
              return <strong>{Number(fila.saldoDia ?? 0).toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 })}</strong>;
            }
            if (col.campo === "semana") return String(fila.semana ?? "—");
            return null;
          }}
        />
      </div>
    </>
  );
});

export default CarteraTab;
