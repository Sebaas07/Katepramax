import { useMemo, memo } from "react";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import { TarjetaResumen } from "./ContabilidadUI";

const COLUMNAS = [
  { campo: "fecha",       label: "Fecha",    tipo: "fecha"  },
  { campo: "semana",      label: "Sem.",     tipo: "texto"  },
  { campo: "sede",        label: "Sede",     tipo: "texto"  },
  { campo: "efectivo",    label: "Efectivo", tipo: "moneda" },
  { campo: "cuentas",     label: "Cuentas",  tipo: "moneda" },
  { campo: "total",       label: "Total",    tipo: "moneda" },
  { campo: "observacion", label: "Obs.",     tipo: "texto"  },
];

const IngresosTab = memo(({ ingresos, sedes, esAdmin, onEditar, onEliminar }) => {
  const resumenEfectivo = useMemo(() => sedes.map((s) => ({
    sede: s.nombre,
    valor: ingresos.filter((i) => i.sedeId === s.id).reduce((sum, i) => sum + Number(i.efectivo ?? 0), 0),
  })), [ingresos, sedes]);

  const resumenCuentas = useMemo(() => sedes.map((s) => ({
    sede: s.nombre,
    valor: ingresos.filter((i) => i.sedeId === s.id).reduce((sum, i) => sum + Number(i.cuentas ?? 0), 0),
  })), [ingresos, sedes]);

  const resumenTotal = useMemo(() => sedes.map((s) => ({
    sede: s.nombre,
    valor: ingresos.filter((i) => i.sedeId === s.id).reduce((sum, i) => sum + Number(i.total ?? 0), 0),
  })), [ingresos, sedes]);

  const totalEfectivo = useMemo(() => ingresos.reduce((sum, i) => sum + Number(i.efectivo ?? 0), 0), [ingresos]);
  const totalCuentas  = useMemo(() => ingresos.reduce((sum, i) => sum + Number(i.cuentas  ?? 0), 0), [ingresos]);
  const totalGeneral  = useMemo(() => ingresos.reduce((sum, i) => sum + Number(i.total    ?? 0), 0), [ingresos]);

  const acciones = useMemo(() =>
    esAdmin
      ? (row) => [
          { label: "Editar",   icon: "edit",   onClick: () => onEditar(row, "ingreso") },
          { label: "Eliminar", icon: "delete", variante: "danger", onClick: () => onEliminar(row, "ingreso") },
        ]
      : undefined,
  [esAdmin, onEditar, onEliminar]);

  return (
    <>
      {ingresos.length > 0 && (
        <div className="cont-resumen-row">
          <TarjetaResumen titulo="Efectivo"                icono="payments"        color="var(--aged-gold)" filas={resumenEfectivo} total={totalEfectivo} />
          <TarjetaResumen titulo="Cuentas / Transferencias" icono="account_balance" color="var(--secondary)" filas={resumenCuentas}  total={totalCuentas}  />
          <TarjetaResumen titulo="Total Ingresos"          icono="trending_up"     color="#4ade80"          filas={resumenTotal}    total={totalGeneral}  />
        </div>
      )}
      <div className="cont-tabla-wrap">
        <TablaGenerica
          columnas={COLUMNAS}
          datos={ingresos}
          filasPorPagina={10}
          mostrarBuscador
          buscarEnCampos={["sede", "observacion"]}
          paginacion
          renderAcciones={acciones}
        />
      </div>
    </>
  );
};

export default IngresosTab;
