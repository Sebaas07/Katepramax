import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import { COLUMNAS_CLIENTES } from "./cliente.constants";

const ClienteContenido = ({
  cargando,
  clientes,
  accionesCliente,
  modalClienteAbierto,
  modalConfirmAbierto,
  clienteSeleccionado,
  formCliente,
  sedes,
  esAdmin,
  cargandoSedes,
  guardando,
  onCerrarCliente,
  onCerrarConfirmacion,
  onGuardar,
  onDesactivar,
  onCambioForm,
}) => (
  <>
    <div className="tab-content">
      {cargando ? (
        <div className="cli-spinner-wrap"><div className="cli-spinner" /><span>Cargando clientes...</span></div>
      ) : (
        <TablaGenerica
          columnas={COLUMNAS_CLIENTES}
          datos={clientes.map((cliente) => ({ ...cliente, sedeNombre: cliente.sede?.nombre ?? "Sin asignar" }))}
          filasPorPagina={10}
          mostrarBuscador
          buscarEnCampos={["nombre", "telefono"]}
          paginacion
          renderAcciones={accionesCliente}
        />
      )}
    </div>

    <Modal
      isOpen={modalClienteAbierto}
      onClose={onCerrarCliente}
      titulo={clienteSeleccionado ? "Editar Cliente" : "Nuevo Cliente"}
      textoBotonConfirmar={guardando ? "Guardando..." : "Guardar"}
      onConfirmar={onGuardar}
      mostrarCancelar
    >
      <div className="modal-form">
        <div className="form-group">
          <label htmlFor="cli-nombre">Nombre *</label>
          <input id="cli-nombre" type="text" name="nombre" value={formCliente.nombre} onChange={onCambioForm} className="form-control" placeholder="Nombre del cliente o empresa" />
        </div>
        <div className="form-group">
          <label htmlFor="cli-telefono">Teléfono</label>
          <input id="cli-telefono" type="tel" name="telefono" value={formCliente.telefono} onChange={onCambioForm} className="form-control" placeholder="3XX XXX XXXX" />
        </div>
        {esAdmin && (
          <div className="form-group">
            <label htmlFor="cli-sede">Sede *</label>
            <select id="cli-sede" name="sedeId" value={formCliente.sedeId} onChange={onCambioForm} className="form-control" disabled={cargandoSedes}>
              <option value="">— Selecciona —</option>
              {sedes.flatMap((sede) => sede.tipo === "Oficina" ? [<option key={sede.id} value={sede.id}>{sede.nombre}</option>] : [])}
            </select>
          </div>
        )}
        <div className="form-group">
          <label htmlFor="cli-limite">Límite de crédito (COP)</label>
          <input id="cli-limite" type="text" name="limiteCredito" value={formCliente.limiteCredito} onChange={onCambioForm} className="form-control" placeholder="0" />
        </div>
        {clienteSeleccionado && (
          <div className="form-group">
            <label htmlFor="cli-deuda">Saldo de deuda (COP)</label>
            <input id="cli-deuda" type="text" name="saldoDeuda" value={formCliente.saldoDeuda} onChange={onCambioForm} className="form-control" placeholder="0" />
          </div>
        )}
        <div className="form-group form-group--check">
          <label htmlFor="cli-activo" className="cli-check-label">
            <input id="cli-activo" type="checkbox" name="activo" checked={formCliente.activo} onChange={onCambioForm} className="cli-checkbox" />
            Cliente activo
          </label>
        </div>
      </div>
    </Modal>

    <Modal
      isOpen={modalConfirmAbierto}
      onClose={onCerrarConfirmacion}
      titulo="Desactivar Cliente"
      textoBotonConfirmar={guardando ? "Desactivando..." : "Sí, desactivar"}
      onConfirmar={onDesactivar}
      mostrarCancelar
    >
      <div className="cli-confirm-body">
        <span className="material-symbols-outlined cli-confirm-icon">warning</span>
        <p>¿Estás seguro de que quieres desactivar a <strong>{clienteSeleccionado?.nombre}</strong>?</p>
        <p className="cli-confirm-sub">El cliente no aparecerá en nuevos pedidos pero su historial se conserva.</p>
      </div>
    </Modal>
  </>
);

export default ClienteContenido;
