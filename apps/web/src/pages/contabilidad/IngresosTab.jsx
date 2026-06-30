import { useMemo } from "react";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import { TarjetaResumen } from "./ContabilidadUI";
//import { formatCOP } from "@/utils/formatters";

const COLUMNAS = [
  { campo: "fecha", label: "Fecha", tipo: "fecha" },
  { campo: "semana", label: "Sem.", tipo: "texto" },
  { campo: "sede", label: "Sede", tipo: "texto" },
  { campo: "efectivo", label: "Efectivo", tipo: "moneda" },
  { campo: "cuentas", label: "Cuentas", tipo: "moneda" },
  { campo: "total", label: "Total", tipo: "moneda" },
  { campo: "observacion", label: "Obs.", tipo: "texto" },
];

// Backend: GET /ingresos/resumen-semanal → { porSede: [{ sede, sedeId, efectivo, cuentas, total }], totalGeneral: { efectivo, cuentas, total } }
// Backend: GET /ingresos/totales-dia     → [{ fecha, efectivo, cuentas, total }]
const IngresosTab = ({
  ingresos,
  sedes,
  esAdmin,
  onEditar,
  onEliminar,
  resumenSemanal,
  totalesDia,
}) => {
  const usaResumenBackend = Boolean(resumenSemanal?.porSede);

  const resumenEfectivo = useMemo(() => {
    if (usaResumenBackend) {
      return resumenSemanal.porSede.map((s) => ({
        sede: s.sede,
        valor: Number(s.efectivo ?? 0),
      }));
    }
    return sedes.map((s) => ({
      sede: s.nombre,
      valor: ingresos
        .filter((i) => i.sedeId === s.id)
        .reduce((sum, i) => sum + Number(i.efectivo ?? 0), 0),
    }));
  }, [usaResumenBackend, resumenSemanal, ingresos, sedes]);

  const resumenCuentas = useMemo(() => {
    if (usaResumenBackend) {
      return resumenSemanal.porSede.map((s) => ({
        sede: s.sede,
        valor: Number(s.cuentas ?? 0),
      }));
    }
    return sedes.map((s) => ({
      sede: s.nombre,
      valor: ingresos
        .filter((i) => i.sedeId === s.id)
        .reduce((sum, i) => sum + Number(i.cuentas ?? 0), 0),
    }));
  }, [usaResumenBackend, resumenSemanal, ingresos, sedes]);

  const resumenTotal = useMemo(() => {
    if (usaResumenBackend) {
      return resumenSemanal.porSede.map((s) => ({
        sede: s.sede,
        valor: Number(s.total ?? 0),
      }));
    }
    return sedes.map((s) => ({
      sede: s.nombre,
      valor: ingresos
        .filter((i) => i.sedeId === s.id)
        .reduce((sum, i) => sum + Number(i.total ?? 0), 0),
    }));
  }, [usaResumenBackend, resumenSemanal, ingresos, sedes]);

  const totalEfectivo = useMemo(() => {
    if (usaResumenBackend)
      return Number(resumenSemanal.totalGeneral?.efectivo ?? 0);
    return ingresos.reduce((sum, i) => sum + Number(i.efectivo ?? 0), 0);
  }, [usaResumenBackend, resumenSemanal, ingresos]);

  const totalCuentas = useMemo(() => {
    if (usaResumenBackend)
      return Number(resumenSemanal.totalGeneral?.cuentas ?? 0);
    return ingresos.reduce((sum, i) => sum + Number(i.cuentas ?? 0), 0);
  }, [usaResumenBackend, resumenSemanal, ingresos]);

  const totalGeneral = useMemo(() => {
    if (usaResumenBackend)
      return Number(resumenSemanal.totalGeneral?.total ?? 0);
    return ingresos.reduce((sum, i) => sum + Number(i.total ?? 0), 0);
  }, [usaResumenBackend, resumenSemanal, ingresos]);

  const acciones = useMemo(
    () =>
      esAdmin
        ? (row) => [
            {
              label: "Editar",
              icon: "edit",
              onClick: () => onEditar(row, "ingreso"),
            },
            {
              label: "Eliminar",
              icon: "delete",
              variante: "danger",
              onClick: () => onEliminar(row, "ingreso"),
            },
          ]
        : undefined,
    [esAdmin, onEditar, onEliminar],
  );

  return (
    <>
      {(ingresos.length > 0 || usaResumenBackend) && (
        <div className="cont-resumen-row">
          <TarjetaResumen
            titulo="Efectivo"
            icono="payments"
            color="var(--aged-gold)"
            filas={resumenEfectivo}
            total={totalEfectivo}
          />
          <TarjetaResumen
            titulo="Cuentas / Transferencias"
            icono="account_balance"
            color="var(--secondary)"
            filas={resumenCuentas}
            total={totalCuentas}
          />
          <TarjetaResumen
            titulo="Total Ingresos"
            icono="trending_up"
            color="#4ade80"
            filas={resumenTotal}
            total={totalGeneral}
          />
        </div>
      )}
      {totalesDia?.length > 0 && (
        <div className="cont-tabla-wrap">
          <TablaGenerica
            columnas={[
              { campo: "fecha", label: "Fecha", tipo: "fecha" },
              { campo: "efectivo", label: "Efectivo", tipo: "moneda" },
              { campo: "cuentas", label: "Cuentas", tipo: "moneda" },
              { campo: "total", label: "Total", tipo: "moneda" },
            ]}
            datos={totalesDia}
            filasPorPagina={7}
          />
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
