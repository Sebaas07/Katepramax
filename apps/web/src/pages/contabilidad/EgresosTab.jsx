import { useMemo, memo } from "react";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import { TarjetaResumen } from "./ContabilidadUI";

const resumenPorSede = (items, campo, sedes) =>
  sedes.map((s) => ({
    sede:  s.nombre,
    valor: items.filter((i) => i.sedeId === s.id).reduce((sum, i) => sum + Number(i[campo] ?? 0), 0),
  }));

const etiquetaEgreso = (concepto) => {
  if (!concepto) return null;
  const c = concepto.toLowerCase();
  if (c.includes("proveedor") || c.includes("pollo") || c.includes("insumo") || c.includes("mercado"))
    return { label: "Proveedores", color: "var(--aged-gold)" };
  if (c.includes("arriendo") || c.includes("servicio") || c.includes("nomina") || c.includes("sueldo"))
    return { label: "Operativo", color: "#60a5fa" };
  return { label: "General", color: "#c4b5fd" };
};

const CeldaConcepto = memo(({ concepto }) => {
  const et = etiquetaEgreso(concepto);
  if (!et) return concepto ?? "—";
  return (
    <span className="cont-concepto-wrap">
      <span className="cont-concepto-texto">{concepto ?? "—"}</span>
      <span className="cont-etiqueta-egreso" style={{ color: et.color, borderColor: et.color + "44" }}>
        {et.label}
      </span>
    </span>
  );
});

const COLUMNAS = [
  { campo: "fecha",        label: "Fecha",    tipo: "fecha"  },
  { campo: "semana",       label: "Sem.",     tipo: "texto"  },
  { campo: "sede",         label: "Sede",     tipo: "texto"  },
  { campo: "concepto",     label: "Concepto", tipo: "texto"  },
  { campo: "total",        label: "Total",    tipo: "moneda" },
  { campo: "observaciones",label: "Obs.",     tipo: "texto"  },
];

const EgresosTab = memo(({ egresos, sedes, esAdmin, onEditar, onEliminar }) => {
  const resumenPorSedeData = useMemo(() => resumenPorSede(egresos, "total", sedes), [egresos, sedes]);
  const totalEgr = useMemo(() => egresos.reduce((s, i) => s + Number(i.total ?? 0), 0), [egresos]);

  const acciones = useMemo(() =>
    esAdmin
      ? (row) => [
          { label: "Editar",   icon: "edit",   onClick: () => onEditar(row, "egreso") },
          { label: "Eliminar", icon: "delete", variante: "danger", onClick: () => onEliminar(row, "egreso") },
        ]
      : undefined,
  [esAdmin, onEditar, onEliminar]);

  return (
    <>
      {egresos.length > 0 && (
        <div className="cont-resumen-row">
          <TarjetaResumen titulo="Total Egresos" icono="trending_down" color="var(--error)" filas={resumenPorSedeData} total={totalEgr} />
        </div>
      )}
      <div className="cont-tabla-wrap">
        <TablaGenerica
          columnas={COLUMNAS}
          datos={egresos}
          filasPorPagina={10}
          mostrarBuscador
          buscarEnCampos={["sede", "concepto", "observaciones"]}
          paginacion
          renderAcciones={acciones}
          renderCeldaCustom={(fila, col) =>
            col.campo === "concepto" ? <CeldaConcepto concepto={fila.concepto} /> : null
          }
        />
      </div>
    </>
  );
});

export default EgresosTab;
