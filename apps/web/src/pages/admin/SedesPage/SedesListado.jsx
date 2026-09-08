import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import EmptyState from "@/components/common/EmptyState/EmptyState";

const SedesListado = ({
  sedes,
  totalActivas,
  totalInactivas,
  cargando,
  columnas,
  renderAcciones,
  renderCeldaCustom,
  onCrear,
  Spinner,
}) => (
  <>
    <div className="sed-stats">
      <div className="sed-stat-card">
        <span className="material-symbols-outlined">location_city</span>
        <div>
          <span className="sed-stat-valor">{sedes.length}</span>
          <span className="sed-stat-label">Total sedes</span>
        </div>
      </div>
      <div className="sed-stat-card sed-stat-card--activa">
        <span className="material-symbols-outlined">location_on</span>
        <div>
          <span className="sed-stat-valor">{totalActivas}</span>
          <span className="sed-stat-label">Activas</span>
        </div>
      </div>
      <div className="sed-stat-card sed-stat-card--inactiva">
        <span className="material-symbols-outlined">location_off</span>
        <div>
          <span className="sed-stat-valor">{totalInactivas}</span>
          <span className="sed-stat-label">Inactivas</span>
        </div>
      </div>
    </div>

    <div className="tab-content">
      {cargando ? (
        <Spinner />
      ) : sedes.length === 0 ? (
        <EmptyState
          icono="location_city"
          titulo="No hay sedes registradas"
          detalle="Crea la primera sede para comenzar a usarla en el sistema."
        >
          <button className="btn-primary" onClick={onCrear} type="button">
            <span className="material-symbols-outlined">add_location_alt</span>
            Nueva Sede
          </button>
        </EmptyState>
      ) : (
        <TablaGenerica
          columnas={columnas}
          datos={sedes}
          filasPorPagina={10}
          mostrarBuscador
          buscarEnCampos={["nombre"]}
          paginacion
          renderAcciones={renderAcciones}
          renderCeldaCustom={renderCeldaCustom}
        />
      )}
    </div>
  </>
);

export default SedesListado;
