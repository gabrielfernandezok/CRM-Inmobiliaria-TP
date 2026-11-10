import { useLocation } from 'react-router-dom';

export default function ComingSoonPage() {
  const location = useLocation();

  return (
    <section className="page-section">
      <p className="eyebrow">Módulo</p>
      <h1>Próximamente</h1>
      <p className="muted">Esta pantalla todavía no está disponible.</p>
      <p className="route-label">Ruta: {location.pathname}</p>
    </section>
  );
}
