import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import { COLUMNAS_ENVIOS } from "./envios.constants";

const EnviosListado = ({ tab, esAdmin, cargando, datosTabla, renderAcciones, onTabChange }) => (
  <>
    <div className="env-tabs">
      {esAdmin && <button type="button" className={tab === "todos" ? "tab-active" : "tab-btn"} onClick={() => onTabChange("todos")}><span className="material-symbols-outlined" aria-hidden="true">list_alt</span>Todos los envíos</button>}
      <button type="button" className={tab === "recibidos" ? "tab-active" : "tab-btn"} onClick={() => onTabChange("recibidos")}><span className="material-symbols-outlined" aria-hidden="true">move_to_inbox</span>Por confirmar (recibidos)</button>
      <button type="button" className={tab === "enviados" ? "tab-active" : "tab-btn"} onClick={() => onTabChange("enviados")}><span className="material-symbols-outlined" aria-hidden="true">outbox</span>Enviados por mí</button>
    </div>
    <div className="tab-content">
      {cargando ? <div className="env-spinner-wrap"><div className="env-spinner" /><span>Cargando envíos...</span></div> : datosTabla.length === 0 ? (
        <div className="env-empty"><span className="material-symbols-outlined" aria-hidden="true">local_shipping</span><p>{tab === "recibidos" ? "No tienes envíos pendientes por confirmar." : tab === "enviados" ? "No has creado envíos hacia otras sedes." : "No hay envíos registrados."}</p></div>
      ) : <TablaGenerica columnas={COLUMNAS_ENVIOS} datos={datosTabla} filasPorPagina={10} mostrarBuscador buscarEnCampos={["sedeOrigenNombre", "sedeDestinoNombre", "creadorNombre"]} paginacion renderAcciones={renderAcciones} />}
    </div>
  </>
);

export default EnviosListado;
