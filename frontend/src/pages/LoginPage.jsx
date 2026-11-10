import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = useState(0);

  useEffect(() => {
    if (rateLimitSeconds === 0) return undefined;
    const timeout = window.setTimeout(() => {
      setRateLimitSeconds((seconds) => seconds - 1);
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [rateLimitSeconds]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const credentials = identifier.includes('@')
      ? { mail: identifier.trim(), contrasena }
      : { nombreUsuario: identifier.trim(), contrasena };
    try {
      await login(credentials);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (requestError) {
      setError(requestError);
      if (requestError.status === 429) setRateLimitSeconds(10);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">CRM Inmobiliaria</p>
        <h1>Ingresar</h1>
        <p className="muted">Accedé con tu usuario o correo electrónico.</p>
        {location.state?.registered && (
          <div className="notice notice-success" role="status">
            Cuenta creada. Ya podés iniciar sesión.
          </div>
        )}
        <ApiErrorMessage error={error} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="col-12 field">
            <span>Usuario o correo electrónico</span>
            <input
              autoComplete="username"
              required
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>
          <label className="col-12 field">
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              minLength="8"
              required
              value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
            />
          </label>
          <div className="col-12">
            <button
              className="button button-primary button-full"
              disabled={submitting || rateLimitSeconds > 0}
            >
              {submitting
                ? 'Ingresando…'
                : rateLimitSeconds > 0
                  ? `Esperá ${rateLimitSeconds} segundos`
                  : 'Ingresar'}
            </button>
          </div>
        </form>
        <p className="auth-switch">¿Todavía no tenés cuenta? <Link to="/registro">Crear cuenta</Link></p>
      </section>
    </main>
  );
}
