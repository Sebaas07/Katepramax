import { useMemo, memo } from "react";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import {
  TarjetaResumen,
  TarjetaResumenProveedor,
  DeudaBadge,
} from "./ContabilidadUI";

const toNumber = (v) => Number(v ?? 0);

const estadoDeuda = (prov) => {
  if (!prov) return "pendiente";
  if (prov.deudaVencida || prov.estadoDeuda === "vencida") return "vencida";
  const saldo = toNumber(prov.saldoPendiente ?? prov.valorPendiente ?? 0);
  if (saldo > 0) return "pendiente";
  return "al_dia";
};

const COLUMNAS = [
  { campo: "fecha", label: "Fecha", tipo: "fecha" },
  { campo: "semana", label: "Sem.", tipo: "texto" },
  { campo: "sede", label: "Sede", tipo: "texto" },
  { campo: "proveedor", label: "Proveedor", tipo: "texto" },
  { campo: "valorPagado", label: "Pagado", tipo: "moneda" },
  { campo: "deuda", label: "Deuda", tipo: "moneda" },
  { campo: "estadoDeuda", label: "Estado", tipo: "estado" },
  { campo: "observacion", label: "Obs.", tipo: "texto" },
  { campo: "comprobante", label: "Comprobante", tipo: "texto" },
];

// Backend: GET /abonos/resumen-sede → [{ sede, sedeId, totalPagado }]
// saldosDeuda: GET /inventario/deuda-proveedores → [{ proveedor, proveedorId, deudaPendiente, totalAbonado, saldoPendiente }]
const ProveedoresTab = memo(
  ({
    proveedores,
    resumenProv,
    resumenSede,
    esAdmin,
    saldosDeuda = [],
    onAbonar,
    onEditar,
    onEliminar,
  }) => {
    const totalPagado = useMemo(
      () => resumenProv.reduce((t, p) => t + toNumber(p.totalPagado), 0),
      [resumenProv],
    );

    const deudaPorProveedor = useMemo(
      () => new Map(saldosDeuda.map((d) => [Number(d.proveedorId), toNumber(d.saldoPendiente)])),
      [saldosDeuda],
    );
    const totalDeuda = useMemo(
      () => [...deudaPorProveedor.values()].reduce((t, v) => t + v, 0),
      [deudaPorProveedor],
    );

    // Filas de la tarjeta "Deuda pendiente": solo proveedores con saldo.
    const filasDeuda = useMemo(
      () =>
        saldosDeuda
          .filter((d) => toNumber(d.saldoPendiente) > 0)
          .slice(0, 4)
          .map((d) => ({ sede: d.proveedor, valor: toNumber(d.saldoPendiente) })),
      [saldosDeuda],
    );

    // Filas de "Pagado por sede": usa el endpoint /abonos/resumen-sede si está disponible,
    // si no, lo calcula desde resumenProv agrupado por proveedor (comportamiento anterior)
    const filasPagadoSede = useMemo(() => {
      if (resumenSede?.length > 0) {
        return resumenSede.map((s) => ({
          sede: s.sede,
          valor: toNumber(s.totalPagado),
        }));
      }
      return resumenProv
        .slice(0, 4)
        .map((p) => ({ sede: p.proveedor, valor: p.totalPagado }));
    }, [resumenSede, resumenProv]);

    const totalPagadoSede = useMemo(() => {
      if (resumenSede?.length > 0)
        return resumenSede.reduce((t, s) => t + toNumber(s.totalPagado), 0);
      return totalPagado;
    }, [resumenSede, totalPagado]);

    const acciones = useMemo(
      () => (row) => {
        const base = [
          {
            label: "Abonar",
            icon: "payments",
            variante: "success",
            onClick: () => onAbonar(row),
          },
          { label: "Editar", icon: "edit", onClick: () => onEditar(row) },
        ];
        if (esAdmin) {
          base.push({
            label: "Eliminar",
            icon: "delete",
            variante: "danger",
            onClick: () => onEliminar(row, "abono"),
          });
        }
        return base;
      },
      [esAdmin, onAbonar, onEditar, onEliminar],
    );

    return (
      <>
        {(proveedores.length > 0 || resumenSede?.length > 0) && (
          <div className="cont-resumen-row">
            <TarjetaResumen
              titulo="Pagado por Sede"
              icono="account_balance_wallet"
              color="var(--secondary)"
              filas={filasPagadoSede}
              total={totalPagadoSede}
            />
            <TarjetaResumenProveedor
              titulo="Abonos por Proveedor"
              icono="receipt_long"
              color="#4ade80"
              filas={resumenProv
                .slice(0, 4)
                .map((p) => ({ sede: p.proveedor, valor: p.totalPagado }))}
              total={totalPagado}
            />
            {totalDeuda > 0 && (
              <TarjetaResumenProveedor
                titulo="Deuda Pendiente"
                icono="account_balance"
                color="#f87171"
                filas={filasDeuda}
                total={totalDeuda}
              />
            )}
          </div>
        )}
        <div className="cont-tabla-wrap">
          <TablaGenerica
            columnas={COLUMNAS}
            datos={proveedores}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["sede", "proveedor", "observacion", "comprobante"]}
            paginacion
            renderAcciones={acciones}
            renderCeldaCustom={(fila, col) =>
              col.campo === "estadoDeuda" ? (
                <DeudaBadge estado={estadoDeuda(fila)} />
              ) : null
            }
          />
        </div>
      </>
    );
  },
);

export default ProveedoresTab;
