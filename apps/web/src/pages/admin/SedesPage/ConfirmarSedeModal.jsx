import Modal from "@/components/common/Modal/Modal";

const ConfirmarSedeModal = ({
  isOpen,
  sede,
  guardando,
  onClose,
  onConfirmar,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    titulo={sede?.activo ? "Desactivar Sede" : "Activar Sede"}
    textoBotonConfirmar={
      guardando ? "Procesando..." : sede?.activo ? "Sí, desactivar" : "Sí, activar"
    }
    onConfirmar={onConfirmar}
    mostrarCancelar
  >
    <div className="sed-confirm-body">
      <span className="material-symbols-outlined sed-confirm-icon">
        {sede?.activo ? "location_off" : "location_on"}
      </span>
      <p>
        ¿Está seguro de que desea <strong>{sede?.activo ? "desactivar" : "activar"}</strong> la
        sede <strong>{sede?.nombre}</strong>?
      </p>
      <p className="sed-confirm-sub">
        {sede?.activo
          ? "La sede ya no aparecerá en los selectores y no permitirá nuevos cargos."
          : "La sede volverá a estar disponible para todo el sistema."}
      </p>
    </div>
  </Modal>
);

export default ConfirmarSedeModal;
