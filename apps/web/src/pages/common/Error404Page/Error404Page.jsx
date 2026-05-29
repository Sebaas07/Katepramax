import { useNavigate } from "react-router-dom";
import { estaLogueado } from "@/utils/sessionHelper";
import "../ErrorPages.css";

const Error404Page = () => {
  const navigate = useNavigate();

  const handleVolver = () => {
    navigate(estaLogueado() ? "/dashboard" : "/login");
  };

  return (
    <div className="error-page">
      <div className="error-page__card">
        <div className="error-page__icono-wrap error-page__icono-wrap--info">
          <span className="material-symbols-outlined">travel_explore</span>
        </div>

        <h1 className="error-page__codigo">404</h1>

        <h2 className="error-page__titulo">Página no encontrada</h2>

        <p className="error-page__descripcion">
          La ruta que intentas acceder no existe o fue movida. Revisa la
          dirección o vuelve al inicio.
        </p>

        <button
          className="error-page__btn"
          onClick={handleVolver}
          type="button"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {estaLogueado() ? "Volver al dashboard" : "Ir al login"}
        </button>
      </div>
    </div>
  );
};

export default Error404Page;
