const LoginBrand = () => (
  <section className="login__brand">
    <div className="login__brand-geo" aria-hidden="true">
      <svg
        viewBox="0 0 800 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#C5B358" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="fade" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="#C5B358" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#131316" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="800" height="900" fill="url(#grid)" />
        <rect width="800" height="900" fill="url(#fade)" />
        <polygon points="400,80 480,125 480,215 400,260 320,215 320,125" fill="none" stroke="#C5B358" strokeWidth="1" />
        <polygon points="700,600 820,668 820,805 700,873 580,805 580,668" fill="none" stroke="#C5B358" strokeWidth="0.8" opacity="0.4" />
        <polygon points="-50,200 100,113 250,200 250,373 100,460 -50,373" fill="none" stroke="#C5B358" strokeWidth="0.8" opacity="0.3" />
        <line x1="0" y1="900" x2="300" y2="0" stroke="#C5B358" strokeWidth="0.6" opacity="0.2" />
        <line x1="200" y1="900" x2="500" y2="0" stroke="#C5B358" strokeWidth="0.6" opacity="0.15" />
        <line x1="500" y1="900" x2="800" y2="0" stroke="#C5B358" strokeWidth="0.6" opacity="0.1" />
        <circle cx="650" cy="150" r="120" fill="none" stroke="#C5B358" strokeWidth="0.7" opacity="0.3" />
        <circle cx="650" cy="150" r="80" fill="none" stroke="#C5B358" strokeWidth="0.5" opacity="0.2" />
        <circle cx="100" cy="750" r="90" fill="none" stroke="#C5B358" strokeWidth="0.7" opacity="0.25" />
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
  </section>
);

export default LoginBrand;
