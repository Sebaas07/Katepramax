import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import "./LoginPage.css";

const LoginPage = () => {
  const navigate = useNavigate();
  const {
    login,
    isAuthenticated,
    isLoading: authLoading,
    isSessionChecked,
    error: authError,
  } = useAuth();

  // Estados locales del formulario
  const [form, setForm] = useState(() => {
    const usuarioRecordado = localStorage.getItem("usuario_recordado");
    return {
      usuario: usuarioRecordado || "",
      contrasena: "",
    };
  });
  const [errorLocal, setErrorLocal] = useState("");
  const [cargandoLocal, setCargandoLocal] = useState(false);
  const [mostrarClave, setMostrarClave] = useState(false);
  const [recordar, setRecordar] = useState(() => {
    return localStorage.getItem("usuario_recordado") !== null;
  });

  // Si hay un error en el contexto lo muestra; si no, muestra el error local del formulario
  const error = authError || errorLocal;

  // Si el auth está cargando o nuestro botón local se activó, entonces está cargando
  // Pero si el contexto arroja un error, forzamos a que deje de cargar
  const cargando = authError ? false : authLoading || cargandoLocal;

  // Si ya está autenticado, redirigir
  useEffect(() => {
    if (isAuthenticated && isSessionChecked) {
      const sesion = JSON.parse(localStorage.getItem("usuario") || "{}");
      const redirectPath =
        sesion?.rol === "Entregador" ? "/entregas" : "/dashboard";
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, isSessionChecked, navigate]);

  const manejarCambio = (e) => {
    setErrorLocal("");
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const manejarSubmit = async (e) => {
    e.preventDefault();

    if (!form.usuario.trim() || !form.contrasena.trim()) {
      setErrorLocal("Por favor ingresa tu usuario y contraseña.");
      return;
    }

    setCargandoLocal(true);
    setErrorLocal("");

    const exito = await login(form.usuario.trim(), form.contrasena);

    if (!exito) {
      setCargandoLocal(false);
    }
  };

  // Guardar usuario si selecciona "recordarme"
  const handleRecordarChange = (e) => {
    const checked = e.target.checked;
    setRecordar(checked);
    if (!checked) {
      localStorage.removeItem("usuario_recordado");
    }
  };

  return (
    <div className="login">
      {/* ── Panel izquierdo — Branding geométrico ── */}
      <section className="login__brand">
        <div className="login__brand-geo">
          <svg
            viewBox="0 0 800 900"
            preserveAspectRatio="xMidYMid slice"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern
                id="grid"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="none"
                  stroke="#C5B358"
                  strokeWidth="0.5"
                />
              </pattern>
              <radialGradient id="fade" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="#C5B358" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#131316" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="800" height="900" fill="url(#grid)" />
            <rect width="800" height="900" fill="url(#fade)" />
            <polygon
              points="400,80 480,125 480,215 400,260 320,215 320,125"
              fill="none"
              stroke="#C5B358"
              strokeWidth="1"
            />
            <polygon
              points="400,100 465,137 465,213 400,250 335,213 335,137"
              fill="rgba(197,179,88,0.04)"
              stroke="#C5B358"
              strokeWidth="0.5"
            />
            <polygon
              points="700,600 820,668 820,805 700,873 580,805 580,668"
              fill="none"
              stroke="#C5B358"
              strokeWidth="0.8"
              opacity="0.4"
            />
            <polygon
              points="-50,200 100,113 250,200 250,373 100,460 -50,373"
              fill="none"
              stroke="#C5B358"
              strokeWidth="0.8"
              opacity="0.3"
            />
            <line
              x1="0"
              y1="900"
              x2="300"
              y2="0"
              stroke="#C5B358"
              strokeWidth="0.6"
              opacity="0.2"
            />
            <line
              x1="200"
              y1="900"
              x2="500"
              y2="0"
              stroke="#C5B358"
              strokeWidth="0.6"
              opacity="0.15"
            />
            <line
              x1="500"
              y1="900"
              x2="800"
              y2="0"
              stroke="#C5B358"
              strokeWidth="0.6"
              opacity="0.1"
            />
            <circle
              cx="650"
              cy="150"
              r="120"
              fill="none"
              stroke="#C5B358"
              strokeWidth="0.7"
              opacity="0.3"
            />
            <circle
              cx="650"
              cy="150"
              r="80"
              fill="none"
              stroke="#C5B358"
              strokeWidth="0.5"
              opacity="0.2"
            />
            <circle
              cx="100"
              cy="750"
              r="90"
              fill="none"
              stroke="#C5B358"
              strokeWidth="0.7"
              opacity="0.25"
            />
          </svg>
        </div>

        <div className="login__brand-top">
          <div className="login__brand-logo-box">
            <span className="material-symbols-outlined">local_shipping</span>
          </div>
          <div className="login__brand-wordmark">
            <span className="login__brand-name">KATEPRAMAX</span>
            <span className="login__brand-tagline">ERP Distribution</span>
          </div>
        </div>

        <div className="login__brand-center">
          <h2 className="login__brand-headline">
            Gestión Logística con
            <br />
            <span>Precisión Institucional.</span>
          </h2>
          <p className="login__brand-desc">
            Plataforma ERP para el control total de inventario, distribución y
            contabilidad en múltiples sedes.
          </p>
        </div>

        <div className="login__brand-bottom">
          <div className="login__brand-stat">
            <span className="login__brand-stat-label">Sedes activas</span>
            <span className="login__brand-stat-value">
              Bogotá · Cartagena · Villavicencio
            </span>
          </div>
        </div>
      </section>

      {/* ── Panel derecho — Formulario ── */}
      <section className="login__form-panel">
        <div className="login__form-inner">
          <div className="login__logo-mobile">
            <span className="material-symbols-outlined">local_shipping</span>
            <span className="login__logo-mobile-name">KATEPRAMAX</span>
            <span className="login__logo-mobile-sub">ERP Distribution</span>
          </div>

          {/* Card */}
          <div className="login__card">
            <div className="login__card-header">
              <h3 className="login__card-title">Iniciar Sesión</h3>
              <p className="login__card-subtitle">
                Acceda a su portal de administración corporativa.
              </p>
            </div>

            <form className="login__form" onSubmit={manejarSubmit} noValidate>
              {error && (
                <div className="login__error">
                  <span className="material-symbols-outlined">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Usuario */}
              <div className="login__field">
                <label className="login__field-label" htmlFor="usuario">
                  Usuario
                </label>
                <div className="login__field-wrap">
                  <span className="material-symbols-outlined login__field-icon">
                    person
                  </span>
                  <input
                    id="usuario"
                    name="usuario"
                    type="text"
                    className="login__field-input"
                    placeholder="Usuario o correo electrónico"
                    value={form.usuario}
                    onChange={manejarCambio}
                    autoComplete="username"
                    autoFocus
                    disabled={cargando}
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div className="login__field">
                <label className="login__field-label" htmlFor="contrasena">
                  Contraseña
                </label>
                <div className="login__field-wrap">
                  <span className="material-symbols-outlined login__field-icon">
                    lock
                  </span>
                  <input
                    id="contrasena"
                    name="contrasena"
                    type={mostrarClave ? "text" : "password"}
                    className="login__field-input"
                    placeholder="••••••••"
                    value={form.contrasena}
                    onChange={manejarCambio}
                    autoComplete="current-password"
                    disabled={cargando}
                  />
                  <button
                    type="button"
                    className="login__field-toggle"
                    onClick={() => setMostrarClave(!mostrarClave)}
                    tabIndex={-1}
                  >
                    <span className="material-symbols-outlined">
                      {mostrarClave ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Recordarme */}
              <label className="login__remember">
                <input
                  type="checkbox"
                  checked={recordar}
                  onChange={handleRecordarChange}
                />
                <span className="login__remember-text">Recordarme</span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                className="login__btn-submit"
                disabled={cargando}
              >
                {cargando ? (
                  <>
                    <div className="login__spinner" /> Verificando...
                  </>
                ) : (
                  <>
                    Ingresar al Sistema
                    <span className="material-symbols-outlined">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="login__legal">
            <span>© 2026 Katepramax</span>
            <div className="login__legal-links">
              <a href="#">Privacidad</a>
              <a href="#">Términos</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LoginPage;
