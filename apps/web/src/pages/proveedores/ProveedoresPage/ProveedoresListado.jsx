import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import EmptyState from "@/components/common/EmptyState/EmptyState";

const ProveedoresListado = ({
  proveedores,
  proveedoresConDeuda,
  totalActivos,
  totalInactivos,
  cargando,
  columnas,
  acciones,
  filtros,
}) => (
  <>
    {proveedores.length > 0 && (
      <div className="prov-stats">
        <div className="prov-stat-card">
          <div className="prov-stat-card__icon"><span className="material-symbols-outlined">conveyor_belt</span></div>
          <div className="prov-stat-card__body"><span className="prov-stat-card__valor">{proveedores.length}</span><span className="prov-stat-card__label">Total</span></div>
        </div>
        <div className="prov-stat-card">
          <div className="prov-stat-card__icon"><span className="material-symbols-outlined">check_circle</span></div>
          <div className="prov-stat-card__body"><span className="prov-stat-card__valor">{totalActivos}</span><span className="prov-stat-card__label">Activos</span></div>
        </div>
        {totalInactivos > 0 && (
          <div className="prov-stat-card">
            <div className="prov-stat-card__icon"><span className="material-symbols-outlined">block</span></div>
            <div className="prov-stat-card__body"><span className="prov-stat-card__valor">{totalInactivos}</span><span className="prov-stat-card__label">Inactivos</span></div>
          </div>
        )}
      </div>
    )}

    <div className="tab-content">
      {cargando ? (
        <div className="prov-spinner-wrap">
          <div className="prov-spinner" aria-hidden="true" />
          <span>Cargando proveedores...</span>
        </div>
      ) : proveedores.length > 0 ? (
        <TablaGenerica
          columnas={columnas}
          datos={proveedoresConDeuda}
          filasPorPagina={10}
          mostrarBuscador
          buscarEnCampos={["nombre"]}
          paginacion
          renderAcciones={acciones}
        />
      ) : (
        <EmptyState
          icono="conveyor_belt"
          titulo="No hay proveedores registrados"
          detalle={
            filtros.activo
              ? "Prueba cambiando el filtro de estado."
              : "Crea un nuevo proveedor para comenzar."
          }
        />
      )}
    </div>
  </>
);

export default ProveedoresListado;
