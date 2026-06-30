import { useMemo, memo } from "react";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import { TarjetaResumen } from "./ContabilidadUI";

const calcResumenPorSede = (items, sedes) =>
  sedes.map((s) => ({
    sede: s.nombre,
    valor: items
      .filter((i) => i.sedeId === s.id)
      .reduce((sum, i) => sum + Number(i.total ?? 0), 0),
  }));

const etiquetaEgreso = (concepto) => {
  if (!concepto) return null;
  const c = concepto.toLowerCase();
  if (
    c.includes("proveedor") ||
    c.includes("pollo") ||
    c.includes("insumo") ||
    c.includes("mercado")
  )
    return { label: "Proveedores", color: "var(--aged-gold)" };
  if (
    c.includes("arriendo") ||
    c.includes("servicio") ||
    c.includes("nomina") ||
    c.includes("sueldo")
  )
    return { label: "Operativo", color: "#60a5fa" };
  return { label: "General", color: "#c4b5fd" };
};

const CeldaConcepto = memo(({ concepto }) => {
  const et = etiquetaEgreso(concepto);
  if (!et) return concepto ?? "—";
  return (
    <span className="cont-concepto-wrap">
      <span className="cont-concepto-texto">{concepto ?? "—"}</span>
      <span
        className="cont-etiqueta-egreso"
        style={{ color: et.color, borderColor: et.color + "44" }}
      >
        {et.label}
      </span>
    </span>
  );
});

const COLUMNAS_EGRESOS = [
  { campo: "fecha", label: "Fecha", tipo: "fecha" },
  { campo: "semana", label: "Sem.", tipo: "texto" },
  { campo: "sede", label: "Sede", tipo: "texto" },
  { campo: "concepto", label: "Concepto", tipo: "texto" },
  { campo: "total", label: "Total", tipo: "moneda" },
  { campo: "observaciones", label: "Obs.", tipo: "texto" },
];

const COLUMNAS_DIA = [
  { campo: "fecha", label: "Fecha", tipo: "fecha" },
  { campo: "total", label: "Total", tipo: "moneda" },
];

const COLUMNAS_CONCEPTO = [
  { campo: "concepto", label: "Concepto", tipo: "texto" },
  { campo: "registros", label: "Registros", tipo: "texto" },
  { campo: "total", label: "Total", tipo: "moneda" },
];

// Backend: GET /egresos/resumen-semanal → { porSede: [{ sede, sedeId, registros, total }], totalGeneral: number }
// Backend: GET /egresos/resumen-concepto → [{ concepto, registros, total }]
// Backend: GET /egresos/totales-dia      → [{ fecha, total }]
const EgresosTab = memo(
  ({
    egresos,
    sedes,
    esAdmin,
    onEditar,
    onEliminar,
    resumenSemanal,
    resumenConcepto,
    totalesDia,
  }) => {
    const usaResumenBackend = Boolean(resumenSemanal?.porSede);

    const filasSede = useMemo(() => {
      if (usaResumenBackend) {
        return resumenSemanal.porSede.map((s) => ({
          sede: s.sede,
          valor: Number(s.total ?? 0),
        }));
      }
      return calcResumenPorSede(egresos, sedes);
    }, [usaResumenBackend, resumenSemanal, egresos, sedes]);

    const totalEgr = useMemo(() => {
      if (usaResumenBackend) return Number(resumenSemanal.totalGeneral ?? 0);
      return egresos.reduce((s, i) => s + Number(i.total ?? 0), 0);
    }, [usaResumenBackend, resumenSemanal, egresos]);

    const acciones = useMemo(
      () =>
        esAdmin
          ? (row) => [
              {
                label: "Editar",
                icon: "edit",
                onClick: () => onEditar(row, "egreso"),
              },
              {
                label: "Eliminar",
                icon: "delete",
                variante: "danger",
                onClick: () => onEliminar(row, "egreso"),
              },
            ]
          : undefined,
      [esAdmin, onEditar, onEliminar],
    );

    return (
      <>
        {(egresos.length > 0 || usaResumenBackend) && (
          <div className="cont-resumen-row">
            <TarjetaResumen
              titulo="Total Egresos"
              icono="trending_down"
              color="var(--error)"
              filas={filasSede}
              total={totalEgr}
            />
          </div>
        )}

        {resumenConcepto?.length > 0 && (
          <div className="cont-tabla-wrap">
            <h4 className="cont-subtitulo">Egresos por concepto</h4>
            <TablaGenerica
              columnas={COLUMNAS_CONCEPTO}
              datos={resumenConcepto}
              filasPorPagina={5}
            />
          </div>
        )}

        {totalesDia?.length > 0 && (
          <div className="cont-tabla-wrap">
            <h4 className="cont-subtitulo">Totales por día</h4>
            <TablaGenerica
              columnas={COLUMNAS_DIA}
              datos={totalesDia}
              filasPorPagina={7}
            />
          </div>
        )}

        <div className="cont-tabla-wrap">
          <TablaGenerica
            columnas={COLUMNAS_EGRESOS}
            datos={egresos}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["sede", "concepto", "observaciones"]}
            paginacion
            renderAcciones={acciones}
            renderCeldaCustom={(fila, col) =>
              col.campo === "concepto" ? (
                <CeldaConcepto concepto={fila.concepto} />
              ) : null
            }
          />
        </div>
      </>
    );
  },
);

export default EgresosTab;
