import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  createVisit,
  getProperty,
  getPropertyContacts,
  getPropertyVisits,
} from '../api/propiedades.js';
import { getMenu } from '../api/menu.js';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';
import {
  formatContactOption,
  formatDate,
  formatDateTime,
  formatEnum,
} from '../utils/format.js';

function findPropertiesProgram(menus) {
  for (const menu of menus) {
    for (const program of menu.programas || []) {
      const route = `/${(program.ruta || '').replace(/^\/+|\/+$/g, '')}`;
      if (route === '/propiedades' || route.startsWith('/propiedades/')) return program;
    }
  }
  return null;
}

function mapsUrl(property) {
  if (property.latitud === null || property.latitud === undefined ||
      property.longitud === null || property.longitud === undefined ||
      property.latitud === '' || property.longitud === '') return null;
  const latitude = Number(property.latitud);
  const longitude = Number(property.longitud);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function contactName(contact) {
  if (!contact) return '—';
  return contact.personaFisica
    ? `${contact.personaFisica.apellido} ${contact.personaFisica.nombres}`.trim()
    : contact.personaJuridica?.razonSocial || `Contacto #${contact.id}`;
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [property, setProperty] = useState(null);
  const [visits, setVisits] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [visitForm, setVisitForm] = useState({ idContacto: '', fechaHora: '', resultado: '' });
  const [error, setError] = useState(null);
  const [visitError, setVisitError] = useState(null);
  const [visitsError, setVisitsError] = useState(null);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [menuError, setMenuError] = useState(null);
  const [success, setSuccess] = useState(location.state?.saved ? 'Los cambios se guardaron correctamente.' : '');
  const [submittingVisit, setSubmittingVisit] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadDetail() {
      setLoading(true);
      setError(null);
      const menuResult = await getMenu().then(
        (value) => ({ status: 'fulfilled', value }),
        (reason) => ({ status: 'rejected', reason })
      );
      if (!active) return;
      if (menuResult.status === 'fulfilled') {
        const program = findPropertiesProgram(Array.isArray(menuResult.value) ? menuResult.value : []);
        setPermissions(program);
        if (program && program.puedeVer !== true) {
          setPermissionsLoaded(true);
          setLoading(false);
          return;
        }
      } else {
        setMenuError(menuResult.reason);
      }
      setPermissionsLoaded(true);
      const [propertyResult, visitsResult] = await Promise.all([
        getProperty(id).then(
          (value) => ({ status: 'fulfilled', value }),
          (reason) => ({ status: 'rejected', reason })
        ),
        getPropertyVisits(id).then(
          (value) => ({ status: 'fulfilled', value }),
          (reason) => ({ status: 'rejected', reason })
        ),
      ]);
      if (!active) return;
      if (propertyResult.status === 'fulfilled') setProperty(propertyResult.value);
      else setError(propertyResult.reason);
      if (visitsResult.status === 'fulfilled') {
        setVisits(Array.isArray(visitsResult.value) ? visitsResult.value : []);
      } else {
        setVisitsError(visitsResult.reason);
      }
      setVisitsLoading(false);
      setLoading(false);
    }
    loadDetail();
    return () => {
      active = false;
    };
  }, [id]);

  const canEdit = permissionsLoaded && (!permissions || permissions.puedeEditar === true);
  const canCreate = permissionsLoaded && (!permissions || permissions.puedeCrear === true);
  const canView = permissionsLoaded && (!permissions || permissions.puedeVer === true);
  const mapLink = useMemo(() => property && mapsUrl(property), [property]);

  useEffect(() => {
    if (!canCreate) return undefined;
    let active = true;
    setContactsLoading(true);
    getPropertyContacts()
      .then((result) => {
        if (active) setContacts(Array.isArray(result) ? result : []);
      })
      .catch((requestError) => {
        if (active) setVisitError(requestError);
      })
      .finally(() => {
        if (active) setContactsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canCreate]);

  function updateVisit(event) {
    setVisitForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submitVisit(event) {
    event.preventDefault();
    setSubmittingVisit(true);
    setVisitError(null);
    setSuccess('');
    try {
      await createVisit({
        idContacto: Number(visitForm.idContacto),
        idPropiedad: Number(id),
        ...(visitForm.fechaHora ? { fechaHora: new Date(visitForm.fechaHora).toISOString() } : {}),
        ...(visitForm.resultado ? { resultado: visitForm.resultado } : {}),
      });
      setVisitForm({ idContacto: '', fechaHora: '', resultado: '' });
      setSuccess('La visita quedó registrada.');
      try {
        const result = await getPropertyVisits(id);
        setVisits(Array.isArray(result) ? result : []);
        setVisitsError(null);
      } catch (requestError) {
        setVisitsError(requestError);
      }
    } catch (requestError) {
      setVisitError(requestError);
    } finally {
      setSubmittingVisit(false);
    }
  }

  if (loading) return <p className="muted" role="status">Cargando propiedad…</p>;
  if (permissions && permissions.puedeVer !== true) {
    return (
      <section className="page-section">
        <div className="notice notice-info" role="status">No tenés permiso para ver esta propiedad.</div>
        <Link className="button button-secondary" to="/propiedades">Volver a propiedades</Link>
      </section>
    );
  }
  if (!property) {
    return (
      <section className="page-section">
        <ApiErrorMessage error={error} />
        <Link className="button button-secondary" to="/propiedades">Volver a propiedades</Link>
      </section>
    );
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Ficha de propiedad</p>
          <h1>{property.direccion}</h1>
          <p className="muted">{formatEnum(property.tipoPropiedad)} · {formatEnum(property.estado)}</p>
        </div>
        <div className="contact-actions">
          <Link className="button button-secondary" to="/propiedades">Volver al listado</Link>
          {canEdit && <Link className="button button-primary" to={`/propiedades/${id}/editar`}>Editar</Link>}
        </div>
      </div>
      {error && <ApiErrorMessage error={error} />}
      {menuError && <ApiErrorMessage error={menuError} />}
      {success && <div className="notice notice-success" role="status">{success}</div>}

      {canView ? (
      <section className="contact-card">
        <h2>Datos de la propiedad</h2>
        <dl className="contact-details">
          <div><dt>Dirección</dt><dd>{property.direccion}</dd></div>
          <div><dt>Localidad</dt><dd>{property.localidad || '—'}</dd></div>
          <div><dt>Tipo</dt><dd>{formatEnum(property.tipoPropiedad)}</dd></div>
          <div><dt>Estado</dt><dd>{formatEnum(property.estado)}</dd></div>
          <div><dt>Ambientes</dt><dd>{property.ambientes ?? '—'}</dd></div>
          <div><dt>Dormitorios</dt><dd>{property.dormitorios ?? '—'}</dd></div>
          <div><dt>Antigüedad</dt><dd>{property.antiguedadAnios == null ? '—' : `${property.antiguedadAnios} años`}</dd></div>
          <div><dt>Superficie</dt><dd>{property.superficie == null ? '—' : `${property.superficie} m²`}</dd></div>
          <div><dt>Apto crédito</dt><dd>{formatEnum(property.aptoCredito)}</dd></div>
          <div><dt>Propiedad horizontal</dt><dd>{property.esPH ? 'Sí' : 'No'}</dd></div>
          <div><dt>Llave entregada</dt><dd>{property.llaveEntregada ? 'Sí' : 'No'}</dd></div>
          <div><dt>Fecha de alta</dt><dd>{formatDate(property.fechaAlta)}</dd></div>
          <div><dt>Latitud</dt><dd>{property.latitud ?? '—'}</dd></div>
          <div><dt>Longitud</dt><dd>{property.longitud ?? '—'}</dd></div>
          {mapLink && (
            <div className="contact-detail-wide">
              <dt>Ubicación</dt>
              <dd><a href={mapLink} target="_blank" rel="noreferrer">Ver ubicación en Google Maps</a></dd>
            </div>
          )}
          <div className="contact-detail-wide">
            <dt>Descripción</dt>
            <dd>{property.descripcion || '—'}</dd>
          </div>
        </dl>

        <div className="contact-related">
          <h3>Propietarios</h3>
          {(property.propietarios || []).length === 0 ? (
            <p className="muted">No hay propietarios informados.</p>
          ) : (
            <ul>
              {property.propietarios.map((owner) => (
                <li key={`${owner.idContacto}-${owner.idPropiedad}`}>
                  {contactName(owner.contacto)} · {owner.porcentaje}%
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="contact-related">
          <h3>Características</h3>
          {(property.caracteristicas || []).length ? (
            <ul>{property.caracteristicas.map((item) => <li key={item.id}>{item.descripcion}</li>)}</ul>
          ) : <p className="muted">No hay características informadas.</p>}
        </div>
      </section>
      ) : (
        <div className="notice notice-info" role="status">No tenés permiso para ver esta propiedad.</div>
      )}

      {canView && (
        <section className="contact-card">
          <div className="contact-card-heading">
            <div>
              <h2>Visitas</h2>
              <p className="muted">Historial de visitas registradas para esta propiedad.</p>
            </div>
          </div>
          <ApiErrorMessage error={visitsError} />
          {visitsLoading ? (
            <p className="muted" role="status">Cargando visitas…</p>
          ) : visits.length === 0 && !visitsError ? (
            <p className="empty-state">Todavía no hay visitas registradas para esta propiedad.</p>
          ) : visits.length > 0 ? (
            <div className="table-scroll">
              <table className="property-visits-table">
                <thead>
                  <tr>
                    <th scope="col">Fecha y hora</th>
                    <th scope="col">Contacto</th>
                    <th scope="col">Resultado</th>
                    <th scope="col">Registrada por</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((visit) => (
                    <tr key={visit.id}>
                      <td>{formatDateTime(visit.fechaHora)}</td>
                      <td>{formatContactOption(visit.contacto)}</td>
                      <td>{visit.resultado || '—'}</td>
                      <td>{visit.usuario?.nombreUsuario || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      )}

      {canView && canCreate && (
        <section className="contact-card">
          <h2>Registrar visita</h2>
          <ApiErrorMessage error={visitError} />
          <form className="form-grid contact-form" onSubmit={submitVisit}>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Contacto</span>
              <select
                name="idContacto"
                required
                value={visitForm.idContacto}
                onChange={updateVisit}
                disabled={contactsLoading}
              >
                <option value="">{contactsLoading ? 'Cargando contactos…' : 'Seleccionar contacto'}</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>{formatContactOption(contact)}</option>
                ))}
              </select>
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Fecha y hora (opcional)</span>
              <input name="fechaHora" type="datetime-local" value={visitForm.fechaHora} onChange={updateVisit} />
            </label>
            <label className="col-12 field">
              <span>Resultado (opcional)</span>
              <textarea name="resultado" rows="3" value={visitForm.resultado} onChange={updateVisit} />
            </label>
            <div className="col-12 contact-form-actions">
              <button
                className="button button-primary"
                type="submit"
                disabled={submittingVisit || contactsLoading || contacts.length === 0}
              >
                {submittingVisit ? 'Registrando…' : 'Registrar visita'}
              </button>
            </div>
          </form>
        </section>
      )}

      {!permissions && permissionsLoaded && !menuError && (
        <div className="notice notice-info" role="status">
          La API no devolvió permisos específicos para Propiedades; las acciones dependen de la autorización del backend.
        </div>
      )}
    </section>
  );
}
