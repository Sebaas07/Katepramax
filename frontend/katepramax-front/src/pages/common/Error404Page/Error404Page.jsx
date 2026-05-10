import { useNavigate } from "react-router-dom";
import { estaLogueado } from "@/utils/sessionHelper";

const Error404Page = () => {
  const navigate = useNavigate();

  const handleVolver = () => {
    if (estaLogueado()) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", backgroundColor: "#f1f5f9" }}
    >
      <div className="text-center px-3">
        <div
          className="rounded-3 d-inline-flex align-items-center justify-content-center mb-4"
          style={{ width: 80, height: 80, backgroundColor: "#eff6ff" }}
        >
          <i className="bi bi-map" style={{ fontSize: "2.5rem", color: "#2563eb" }}></i>
        </div>
        <h1 className="fw-black mb-2" style={{ fontSize: "5rem", color: "#0f1b2d", lineHeight: 1 }}>
          404
        </h1>
        <h5 className="fw-bold mb-2" style={{ color: "#0f1b2d" }}>
          Página no encontrada
        </h5>
        <p className="text-muted mb-4" style={{ fontSize: "0.9375rem", maxWidth: 340, margin: "0 auto 1.5rem" }}>
          La ruta que intentas acceder no existe o fue movida.
        </p>
        <button
          className="btn px-4 py-2 fw-semibold"
          style={{ backgroundColor: "#0f1b2d", color: "#fff", borderRadius: "0.5rem" }}
          onClick={handleVolver}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Volver al inicio
        </button>
      </div>
    </div>
  );
};

export default Error404Page;