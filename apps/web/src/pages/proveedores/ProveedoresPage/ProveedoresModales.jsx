import Modal from "@/components/common/Modal/Modal";

const ProveedoresModales = ({
  modalProveedorAbierto,
  modalEliminarAbierto,
  proveedorSeleccionado,
  formProveedor,
  guardando,
  onCerrarProveedor,
  onCerrarEliminar,
  onGuardar,
  onEliminar,
  onCambioForm,
}) => (
  <>
    <Modal
      isOpen={modalProveedorAbierto}
      onClose={onCerrarProveedor}
      titulo={proveedorSeleccionado ? "Editar Proveedor" : "Nuevo Proveedor"}
      onConfirmar={onGuardar}
      mostrarCancelar
      disabled={guardando}
      textoBotonConfirmar={guardando ? "Guardando..." : "Guardar Proveedor"}
    >
      <div className="modal-form">
        {!proveedorSeleccionado && (
          <div className="prov-modal-header-icon">
            <span className="material-symbols-outlined">conveyor_belt</span>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="nombre-input">Nombre del Proveedor *</label>
          <input
            id="nombre-input"
            type="text"
            name="nombre"
            value={formProveedor.nombre}
            onChange={onCambioForm}
            className="form-control"
            placeholder="Ej: Distribuidora Carnes El Rey"
            autoComplete="off"
            autoFocus={!proveedorSeleccionado}
          />
          <span className="prov-nombre-hint">
            Ingresa el nombre exacto tal como aparecerá en los registros
          </span>
        </div>
        <div className="prov-activo-card">
          <div className="prov-activo-card__info">
            <span className="prov-activo-card__label">Proveedor activo</span>
            <span className="prov-activo-card__sub">
              {formProveedor.activo
                ? "Visible en el sistema y disponible para asignar"
                : "Oculto de los listados activos"}
            </span>
          </div>
          <label className="prov-toggle" aria-label="Proveedor activo">
            <input
              type="checkbox"
              name="activo"
              checked={formProveedor.activo}
              onChange={onCambioForm}
            />
            <span className="prov-toggle__slider" />
          </label>
        </div>
      </div>
    </Modal>

    <Modal
      isOpen={modalEliminarAbierto}
      onClose={onCerrarEliminar}
      titulo="Desactivar Proveedor"
      onConfirmar={onEliminar}
      mostrarCancelar
      disabled={guardando}
      textoBotonConfirmar={guardando ? "Desactivando..." : "Desactivar"}
    >
      <div className="modal-form prov-confirm-body">
        {proveedorSeleccionado && (
          <>
            <span className="material-symbols-outlined prov-confirm-icon" aria-hidden="true">
              warning
            </span>
            <div>
              <p>
                ¿Está seguro de que desea desactivar a <strong>{proveedorSeleccionado.nombre}</strong>?
              </p>
              <p className="prov-confirm-sub">
                Esta acción ocultará el proveedor de los listados activos.
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  </>
);

export default ProveedoresModales;
