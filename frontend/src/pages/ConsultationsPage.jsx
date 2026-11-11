import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { createConsultation, getConsultationCatalogs, getConsultationContacts, getConsultationProperties, getConsultations } from '../api/consultas.js';
import { getMenu } from '../api/menu.js';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';
import { formatDate, formatEnum } from '../utils/format.js';

const initialForm = {
  idContacto: '',
  idPropiedad: '',
  idCanal: '',
  mensaje: '',
  estado: 'PENDIENTE',
};

function findConsultationProgram(menus) {
  for (const menu of menus) {
    for (const program of menu.programas || []) {
      const route = `/${(program.ruta || '').replace(/^\/+|\/+$/g, '')}`;
      if (route === '/consultas' || route.startsWith('/consultas/')) return program;
    }
  }
  return null;
}

function displayContact(contact) {
  if (!contact) return '—';
  return contact.personaFisica
    ? `${contact.personaFisica.apellido} ${contact.personaFisica.nombres}`.trim()
    : contact.personaJuridica?.razonSocial || `Contacto #${contact.id}`;
}

function displayProperty(property) {
  if (!property) return '—';
  return `${formatEnum(property.tipoPropiedad)} · ${property.direccion}`;
}

export default function ConsultationsPage() {
  const [consultations, setConsultations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [properties, setProperties] = useState([]);
  const [channels, setChannels] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [listError, setListError] = useState(null);
  const [formDataError, setFormDataError] = useState(null);
  const [success, setSuccess] = useState('');
  const canView = permissions?.puedeVer === true;
  const canCreate = permissions?.puedeCrear === true;

  const loadConsultations = useCallback(async () => {
    const result = await getConsultations();
    setConsultations(Array.isArray(result) ? result : []);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setLoading(true);
      setError(null);
      const menuResult = await getMenu().then(
        (value) => ({ status: 'fulfilled', value }),
        (reason) => ({ status: 'rejected', reason })
      );
      if (!active) return;
      if (menuResult.status === 'rejected') {
        setError(menuResult.reason);
        setPermissions(null);
        setLoading(false);
        return;
      }

      const program = findConsultationProgram(Array.isArray(menuResult.value) ? menuResult.value : []);
      setPermissions(program);
      const requests = [];
      if (program?.puedeVer) {
        requests.push(
          getConsultations().then(
            (value) => ({ key: 'consultations', status: 'fulfilled', value }),
            (reason) => ({ key: 'consultations', status: 'rejected', reason })
          )
        );
      }
      if (program?.puedeCrear) {
        requests.push(
          getConsultationCatalogs().then(
            (value) => ({ key: 'catalogs', status: 'fulfilled', value }),
            (reason) => ({ key: 'catalogs', status: 'rejected', reason })
          ),
          getConsultationContacts().then(
            (value) => ({ key: 'contacts', status: 'fulfilled', value }),
            (reason) => ({ key: 'contacts', status: 'rejected', reason })
          ),
          getConsultationProperties().then(
            (value) => ({ key: 'properties', status: 'fulfilled', value }),
            (reason) => ({ key: 'properties', status: 'rejected', reason })
          )
        );
      }

      const results = await Promise.all(requests);
      if (!active) return;
      const failures = [];
      for (const result of results) {
        if (result.status === 'rejected') {
          failures.push(result.reason);
          continue;
        }
        if (result.key === 'consultations') setConsultations(Array.isArray(result.value) ? result.value : []);
        if (result.key === 'catalogs') setChannels(Array.isArray(result.value?.canales) ? result.value.canales : []);
        if (result.key === 'contacts') setContacts(Array.isArray(result.value) ? result.value : []);
        if (result.key === 'properties') setProperties(Array.isArray(result.value) ? result.value : []);
      }
      if (failures.length) setFormDataError(failures[0]);
      setLoading(false);
    }

    loadPage();
    return () => {
      active = false;
    };
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitConsultation(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess('');
    try {
      await createConsultation({
        idContacto: Number(form.idContacto),
        idPropiedad: form.idPropiedad ? Number(form.idPropiedad) : null,
        idCanal: Number(form.idCanal),
        mensaje: form.mensaje,
        estado: form.estado,
      });
      setForm(initialForm);
      if (canView) {
        try {
          await loadConsultations();
        } catch (requestError) {
          setListError(requestError);
        }
      }
      setSuccess('La consulta quedó registrada.');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="muted" role="status">Cargando consultas…</p>;
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CRM</p>
          <h1>Consultas</h1>
          <p className="muted">Registrá consultas y revisá su estado.</p>
        </div>
        <Link className="button button-secondary" to="/">Volver al inicio</Link>
      </div>

      {error && <ApiErrorMessage error={error} />}
      {success && <div className="notice notice-success" role="status">{success}</div>}
      {!permissions && (
        <div className="notice notice-info" role="status">
          La API no devolvió permisos del programa Consultas; las acciones quedan ocultas.
        </div>
      )}
      {permissions && !canView && !canCreate && (
        <div className="notice notice-info" role="status">
          No tenés permisos para consultar ni registrar consultas.
        </div>
      )}

      {canCreate && (
        <section className="contact-card">
          <h2>Registrar consulta</h2>
          <ApiErrorMessage error={formDataError} />
          <form className="form-grid contact-form" onSubmit={submitConsultation}>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Contacto</span>
              <select name="idContacto" required value={form.idContacto} onChange={updateField}>
                <option value="">Seleccionar contacto</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.nombre} · {contact.activo ? 'Activo' : 'Inactivo'}
                  </option>
                ))}
              </select>
              {contacts.length === 0 && <small className="field-hint">No hay contactos activos disponibles.</small>}
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Canal</span>
              <select name="idCanal" required value={form.idCanal} onChange={updateField}>
                <option value="">Seleccionar canal</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>{channel.descripcion}</option>
                ))}
              </select>
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Propiedad (opcional)</span>
              <select name="idPropiedad" value={form.idPropiedad} onChange={updateField}>
                <option value="">Sin propiedad asociada</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>{displayProperty(property)}</option>
                ))}
              </select>
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Estado</span>
              <select name="estado" value={form.estado} onChange={updateField}>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_SEGUIMIENTO">En seguimiento</option>
                <option value="CERRADA">Cerrada</option>
              </select>
            </label>
            <label className="col-12 field">
              <span>Mensaje</span>
              <textarea name="mensaje" rows="4" required value={form.mensaje} onChange={updateField} />
            </label>
            <div className="col-12 contact-form-actions">
              <button
                className="button button-primary"
                type="submit"
                disabled={submitting || contacts.length === 0 || channels.length === 0}
              >
                {submitting ? 'Registrando…' : 'Registrar consulta'}
              </button>
            </div>
          </form>
        </section>
      )}

      {canView && (
        <section className="contact-card">
          <h2>Listado de consultas</h2>
          <ApiErrorMessage error={listError} />
          {consultations.length === 0 && !listError ? (
            <p className="empty-state">No hay consultas para mostrar.</p>
          ) : !listError ? (
            <div className="table-scroll consultation-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Fecha</th>
                    <th scope="col">Contacto</th>
                    <th scope="col">Canal</th>
                    <th scope="col">Propiedad</th>
                    <th scope="col">Mensaje</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {consultations.map((consultation) => (
                    <tr key={consultation.id}>
                      <td>{formatDate(consultation.fecha)}</td>
                      <td>{displayContact(consultation.contacto)}</td>
                      <td>{consultation.canal?.descripcion || '—'}</td>
                      <td>{displayProperty(consultation.propiedad)}</td>
                      <td className="consultation-message">{consultation.mensaje}</td>
                      <td><span className={`status-badge status-${consultation.estado?.toLowerCase()}`}>{formatEnum(consultation.estado)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      )}
    </section>
  );
}
