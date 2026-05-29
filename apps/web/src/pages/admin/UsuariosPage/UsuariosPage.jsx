import { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "@/hooks/useAuth";
import usuariosService from "@/services/usuarios.service";
import TablaGenerica from "@/components/common/TablaGenerica/TablaGenerica";
import Modal from "@/components/common/Modal/Modal";
import "./UsuariosPage.css";

const Spinner = () => (
  <div className="usr-spinner-wrap">
    <div className="usr-spinner" />
    <span>Cargando usuarios...</span>
  </div>
);

const UsuariosPage = () => {
  const { esAdmin } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [modalConfirmAbierto, setModalConfirmAbierto] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);

  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const data = await usuariosService.obtenerUsuarios();
      setUsuarios(data);
    } catch (err) {
      toast.error("Error al cargar usuarios: " + err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const abrirDesactivar = (usr) => {
    setUsuarioSeleccionado(usr);
    setModalConfirmAbierto(true);
  };

  const handleDesactivar = async () => {
    if (!usuarioSeleccionado) return;
    setGuardando(true);
    try {
      await usuariosService.desactivarUsuario(usuarioSeleccionado.id);
      toast.success("Usuario desactivado.");
      setModalConfirmAbierto(false);
      await cargarUsuarios();
    } catch (err) {
      toast.error("Error al desactivar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  const handleReactivar = async (usr) => {
    try {
      await usuariosService.activarUsuario(usr.id);
      toast.success("Usuario reactivado.");
      await cargarUsuarios();
    } catch (err) {
      toast.error("Error al reactivar: " + err.message);
    }
  };

  const columnas = [
    { campo: "nombreCompleto", label: "Nombre", tipo: "texto" },
    { campo: "usuario", label: "Usuario", tipo: "texto" },
    { campo: "rol", label: "Rol", tipo: "texto" },
    { campo: "sede", label: "Sede", render: (row) => row.sede?.nombre ?? row.sede ?? "" },
    { campo: "activo", label: "Estado", tipo: "booleano" },
    { campo: "creadoEn", label: "Fecha registro", tipo: "fecha" },
  ];

  const acciones = (usr) => {
    const lista = [];
    if (esAdmin && usr.activo) {
      lista.push({
        label: "Desactivar",
        icon: "block",
        variante: "danger",
        onClick: () => abrirDesactivar(usr),
      });
    }
    if (esAdmin && !usr.activo) {
      lista.push({
        label: "Reactivar",
        icon: "check_circle",
        variante: "success",
        onClick: () => handleReactivar(usr),
      });
    }
    return lista;
  };

  return (
    <div className="usuarios-page">
      <div className="page-header">
        <h1>Usuarios</h1>
      </div>

      <div className="tab-content">
        {cargando ? (
          <Spinner />
        ) : (
          <TablaGenerica
            columnas={columnas}
            datos={usuarios}
            filasPorPagina={10}
            mostrarBuscador
            buscarEnCampos={["nombreCompleto", "usuario"]}
            paginacion
            renderAcciones={acciones}
          />
        )}
      </div>

      <Modal
        isOpen={modalConfirmAbierto}
        onClose={() => setModalConfirmAbierto(false)}
        titulo="Desactivar Usuario"
        textoBotonConfirmar={guardando ? "Desactivando..." : "Si, desactivar"}
        onConfirmar={handleDesactivar}
        mostrarCancelar
      >
        <div className="usr-confirm-body">
          <span className="material-symbols-outlined usr-confirm-icon">warning</span>
          <p>
            Estas seguro de desactivar a{" "}
            <strong>{usuarioSeleccionado?.nombreCompleto}</strong>?
          </p>
          <p className="usr-confirm-sub">
            El usuario no podra acceder al sistema pero su historial se conserva.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default UsuariosPage;