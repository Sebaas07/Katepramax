import { useMemo, memo } from "react";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import { TarjetaResumen, TarjetaResumenProveedor, DeudaBadge } from "./ContabilidadUI";

const toNumber = (v) => Number(v ?? 0);

const estadoDeuda = (prov) => {
  if (!prov) return "pendiente";
  if (prov.deudaVencida || prov.estadoDeuda === "vencida") return "vencida";
  const saldo = toNumber(prov.saldoPendiente ?? prov.valorPendiente ?? 0);
  if (saldo > 0) return "pendiente";
  return "al_dia";
};

const COLUMNAS = [
  { campo: "fecha",       label: "Fecha",     tipo: "fecha"  },
  { campo: "semana",      label: "Sem.",      tipo: "texto"  },
  { campo: "sede",        label: "Sede",      tipo: "texto"  },
  { campo: "proveedor",   label: "Proveedor", tipo: "texto"  },
  { campo: "valorPagado", label: "Pagado",    tipo: "moneda" },
  { campo: "estadoDeuda", label: "Estado",    tipo: "estado" },
  { campo: "observacion", label: "Obs.",      tipo: "texto"  },
];

const ProveedoresTab = memo(({ proveedores, resumenProv, esAdmin, onAbonar, onEditar, onEliminar }) => {
  const totalPagado  = useMemo(() => resumenProv.reduce((t, p) => t + toNumber(p.totalPagado), 0), [resumenProv]);
  const totalAbonos  = useMemo(() => resumenProv.reduce((t, p) => t + toNumber(p.abonos),     0), [resumenProv]);

  const acciones = useMemo(() => (row) => {
    const base = [
      { label: "Abonar", icon: "payments", variante: "success", onClick: () => onAbonar(row) },
      { label: "Editar", icon: "edit",                          onClick: () => onEditar(row) },
    ];
    if (esAdmin) {
      base.push({ label: "Eliminar", icon: "delete", variante: "danger", onClick: () => onEliminar(row, "abono") });
    }
    return base;
  }, [esAdmin, onAbonar, onEditar, onEliminar]);

  return (
    <>
      {proveedores.length > 0 && (
        <div className="cont-resumen-row">
          <TarjetaResumen
            titulo="Pagado a Proveedores"
            icono="account_balance_wallet"
            color="var(--secondary)"
            filas={resumenProv.slice(0, 4).map((p) => ({ sede: p.proveedor, valor: p.totalPagado }))}
            total={totalPagado}
          />
          <TarjetaResumenProveedor
            titulo="Abonos Registrados"
            icono="receipt_long"
            color="#4ade80"
            filas={resumenProv.slice(0, 4).map((p) => ({ sede: p.proveedor, valor: p.abonos }))}
            total={totalAbonos}
          />
        </div>
      )}
      <div className="cont-tabla-wrap">
        <TablaGenerica
          columnas={COLUMNAS}
          datos={proveedores}
          filasPorPagina={10}
          mostrarBuscador
          buscarEnCampos={["sede", "proveedor", "observacion"]}
          paginacion
          renderAcciones={acciones}
          renderCeldaCustom={(fila, col) =>
            col.campo === "estadoDeuda" ? <DeudaBadge estado={estadoDeuda(fila)} /> : null
          }
        />
      </div>
    </>
  );
});

export default ProveedoresTab;
