import { useNavigate } from "react-router-dom";

const AccesoDenegadoPage = () => {
  const navigate = useNavigate();

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: "100vh", backgroundColor: "#f1f5f9" }}
    >
      <div className="text-center px-3">
        <div
          className="rounded-3 d-inline-flex align-items-center justify-content-center mb-4"
          style={{ width: 80, height: 80, backgroundColor: "#fef2f2" }}
        >
          <i className="bi bi-shield-x" style={{ fontSize: "2.5rem", color: "#dc2626" }}></i>
        </div>
        <h1 className="fw-black mb-2" style={{ fontSize: "5rem", color: "#0f1b2d", lineHeight: 1 }}>
          403
        </h1>
        <h5 className="fw-bold mb-2" style={{ color: "#0f1b2d" }}>
          Acceso denegado
        </h5>
        <p className="text-muted mb-4" style={{ fontSize: "0.9375rem", maxWidth: 340, margin: "0 auto 1.5rem" }}>
          No tienes permisos para ver esta página. Contacta al administrador si crees que es un error.
        </p>
        <button
          className="btn px-4 py-2 fw-semibold"
          style={{ backgroundColor: "#0f1b2d", color: "#fff", borderRadius: "0.5rem" }}
          onClick={() => navigate("/dashboard")}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Volver al dashboard
        </button>
      </div>
    </div>
  );
};

export default AccesoDenegadoPage;