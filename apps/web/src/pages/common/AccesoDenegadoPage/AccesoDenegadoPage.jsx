import { useNavigate } from "react-router-dom";
import "../ErrorPages.css";

const AccesoDenegadoPage = () => {
  const navigate = useNavigate();

  return (
    <div className="error-page">
      <div className="error-page__card">
        <div className="error-page__icono-wrap error-page__icono-wrap--danger">
          <span className="material-symbols-outlined">shield_lock</span>
        </div>

        <h1 className="error-page__codigo">403</h1>

        <h2 className="error-page__titulo">Acceso denegado</h2>

        <p className="error-page__descripcion">
          No tienes permisos para ver esta página. Si crees que es un error,
          contacta al administrador del sistema.
        </p>

        <button
          className="error-page__btn"
          onClick={() => navigate("/dashboard")}
          type="button"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Volver al dashboard
        </button>
      </div>
    </div>
  );
};

export default AccesoDenegadoPage;
