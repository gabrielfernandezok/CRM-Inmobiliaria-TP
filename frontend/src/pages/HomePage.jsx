import { formatEnum } from '../utils/format.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();
  const profiles = Array.isArray(user?.perfiles) ? user.perfiles : [];
  const displayName = user?.nombre || user?.nombreUsuario || 'Usuario';

  return (
    <section className="page-section">
      <p className="eyebrow">Inicio</p>
      <h1>Bienvenido, {displayName}</h1>
      <p className="muted">Sesión iniciada en el CRM Inmobiliaria.</p>
      <div className="dashboard-grid">
        <article className="summary-card">
          <span className="summary-label">Usuario</span>
          <strong>{displayName}</strong>
        </article>
        <article className="summary-card">
          <span className="summary-label">Perfil{profiles.length === 1 ? '' : 'es'}</span>
          <strong>{profiles.length ? profiles.map(formatEnum).join(', ') : 'Sin perfil informado'}</strong>
        </article>
      </div>
    </section>
  );
}
