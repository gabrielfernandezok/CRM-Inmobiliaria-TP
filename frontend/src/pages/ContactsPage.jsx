import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getContacts } from '../api/contactos.js';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';

export default function ContactsPage() {
  const location = useLocation();
  const [filters, setFilters] = useState({ tipoPersona: '', activo: '' });
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getContacts(filters)
      .then((result) => {
        if (active) setContacts(Array.isArray(result) ? result : []);
      })
      .catch((requestError) => {
        if (active) setError(requestError);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters]);

  function updateFilter(event) {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CRM</p>
          <h1>Contactos</h1>
          <p className="muted">Consultá y filtrá los contactos disponibles para tu usuario.</p>
        </div>
        <Link className="button button-primary" to="/contactos/nuevo">Nuevo contacto</Link>
      </div>

      {location.state?.created && (
        <div className="notice notice-success" role="status">El contacto se creó correctamente.</div>
      )}
      <ApiErrorMessage error={error} />

      <div className="form-grid contact-filters">
        <label className="col-12 col-md-6 col-lg-4 field">
          <span>Tipo de persona</span>
          <select name="tipoPersona" value={filters.tipoPersona} onChange={updateFilter}>
            <option value="">Todos</option>
            <option value="FISICA">Persona física</option>
            <option value="JURIDICA">Persona jurídica</option>
          </select>
        </label>
        <label className="col-12 col-md-6 col-lg-4 field">
          <span>Estado</span>
          <select name="activo" value={filters.activo} onChange={updateFilter}>
            <option value="">Todos</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className="muted" role="status">Cargando contactos…</p>
      ) : !error && contacts.length === 0 ? (
        <p className="empty-state">No se encontraron contactos con esos filtros.</p>
      ) : !error ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Tipo</th>
                <th scope="col">Estado</th>
                <th scope="col">Correo</th>
                <th scope="col">Teléfono</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <Link to={`/contactos/${contact.id}`}>{contact.nombre || '—'}</Link>
                  </td>
                  <td>{contact.tipoPersona === 'FISICA' ? 'Persona física' : 'Persona jurídica'}</td>
                  <td>{contact.activo ? 'Activo' : 'Inactivo'}</td>
                  <td>{contact.mail || '—'}</td>
                  <td>{contact.telefono || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
