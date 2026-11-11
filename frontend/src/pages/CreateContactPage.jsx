import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createContact, getCatalogs, getContact, getContacts } from '../api/contactos.js';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';

const initialForm = {
  tipoPersona: 'FISICA',
  cuitCuil: '',
  telefono: '',
  mail: '',
  domicilio: '',
  localidad: '',
  observaciones: '',
  apellido: '',
  nombres: '',
  dni: '',
  fechaNac: '',
  sexo: '',
  razonSocial: '',
  nombreFantasia: '',
  tipoSocietario: '',
  fechaConstitucion: '',
};

const initialRepresentative = {
  id: '',
  dni: '',
  cargo: '',
  fechaDesde: '',
  fechaHasta: '',
  documentacionRespaldo: '',
};

export default function CreateContactPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [catalogError, setCatalogError] = useState(null);
  const [people, setPeople] = useState([]);
  const [peopleError, setPeopleError] = useState(null);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [representativeSearch, setRepresentativeSearch] = useState('');
  const [representative, setRepresentative] = useState(initialRepresentative);
  const [representativeError, setRepresentativeError] = useState(null);
  const [loadingRepresentative, setLoadingRepresentative] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    getCatalogs()
      .then((catalogs) => {
        if (active) setRoles(Array.isArray(catalogs?.roles) ? catalogs.roles : []);
      })
      .catch((requestError) => {
        if (active) setCatalogError(requestError);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (form.tipoPersona !== 'JURIDICA') return undefined;
    let active = true;
    setPeopleLoading(true);
    setPeopleError(null);
    getContacts({ tipoPersona: 'FISICA' })
      .then((result) => {
        if (active) setPeople(Array.isArray(result) ? result : []);
      })
      .catch((requestError) => {
        if (active) setPeopleError(requestError);
      })
      .finally(() => {
        if (active) setPeopleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [form.tipoPersona]);

  const filteredPeople = useMemo(() => {
    const search = representativeSearch.trim().toLocaleLowerCase('es-AR');
    return people.filter((person) =>
      (person.nombre || '').toLocaleLowerCase('es-AR').includes(search)
    );
  }, [people, representativeSearch]);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateRole(event) {
    const roleId = Number(event.target.value);
    setSelectedRoles((current) =>
      event.target.checked
        ? [...current, roleId]
        : current.filter((id) => id !== roleId)
    );
  }

  async function selectRepresentative(event) {
    const id = event.target.value;
    setRepresentativeError(null);
    setRepresentative({ ...initialRepresentative, id });
    if (!id) return;

    setLoadingRepresentative(true);
    try {
      const contact = await getContact(id);
      if (!contact?.personaFisica?.dni) {
        throw new Error('No se pudo obtener el DNI de la persona seleccionada.');
      }
      setRepresentative((current) => ({ ...current, dni: contact.personaFisica.dni }));
    } catch (requestError) {
      setRepresentative(initialRepresentative);
      setRepresentativeError(requestError);
    } finally {
      setLoadingRepresentative(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const payload = {
      tipoPersona: form.tipoPersona,
      cuitCuil: form.cuitCuil || undefined,
      telefono: form.telefono || undefined,
      mail: form.mail || undefined,
      domicilio: form.domicilio || undefined,
      localidad: form.localidad || undefined,
      observaciones: form.observaciones || undefined,
      roles: selectedRoles,
    };

    if (form.tipoPersona === 'FISICA') {
      Object.assign(payload, {
        apellido: form.apellido,
        nombres: form.nombres,
        dni: Number(form.dni),
        fechaNac: form.fechaNac,
        sexo: form.sexo,
      });
    } else {
      Object.assign(payload, {
        razonSocial: form.razonSocial,
        nombreFantasia: form.nombreFantasia || undefined,
        tipoSocietario: form.tipoSocietario,
        fechaConstitucion: form.fechaConstitucion,
        representantes: [{
          dni: Number(representative.dni),
          cargo: representative.cargo,
          fechaDesde: representative.fechaDesde,
          ...(representative.fechaHasta ? { fechaHasta: representative.fechaHasta } : {}),
          ...(representative.documentacionRespaldo
            ? { documentacionRespaldo: representative.documentacionRespaldo }
            : {}),
        }],
      });
    }

    try {
      await createContact(payload);
      navigate('/contactos', { replace: true, state: { created: true } });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page-section">
      <p className="eyebrow">Contactos</p>
      <h1>Nuevo contacto</h1>
      <p className="muted">Completá los datos de la persona o entidad.</p>
      <ApiErrorMessage error={error} />
      <ApiErrorMessage error={catalogError} />

      <form className="form-grid contact-form" onSubmit={handleSubmit}>
        <label className="col-12 col-md-6 col-lg-4 field">
          <span>Tipo de persona</span>
          <select name="tipoPersona" value={form.tipoPersona} onChange={updateField}>
            <option value="FISICA">Persona física</option>
            <option value="JURIDICA">Persona jurídica</option>
          </select>
        </label>
        <label className="col-12 col-md-6 col-lg-4 field">
          <span>CUIT / CUIL</span>
          <input name="cuitCuil" value={form.cuitCuil} onChange={updateField} />
        </label>
        <label className="col-12 col-md-6 col-lg-4 field">
          <span>Teléfono</span>
          <input name="telefono" type="tel" value={form.telefono} onChange={updateField} />
        </label>
        <label className="col-12 col-md-6 col-lg-4 field">
          <span>Correo electrónico</span>
          <input name="mail" type="email" value={form.mail} onChange={updateField} />
        </label>
        <label className="col-12 col-md-6 col-lg-4 field">
          <span>Domicilio</span>
          <input name="domicilio" value={form.domicilio} onChange={updateField} />
        </label>
        <label className="col-12 col-md-6 col-lg-4 field">
          <span>Localidad</span>
          <input name="localidad" value={form.localidad} onChange={updateField} />
        </label>
        <label className="col-12 field">
          <span>Observaciones</span>
          <textarea name="observaciones" rows="3" value={form.observaciones} onChange={updateField} />
        </label>

        {form.tipoPersona === 'FISICA' ? (
          <>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Apellido</span>
              <input name="apellido" autoComplete="family-name" required value={form.apellido} onChange={updateField} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Nombres</span>
              <input name="nombres" autoComplete="given-name" required value={form.nombres} onChange={updateField} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>DNI</span>
              <input name="dni" type="number" min="1" step="1" required value={form.dni} onChange={updateField} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Fecha de nacimiento</span>
              <input name="fechaNac" type="date" required value={form.fechaNac} onChange={updateField} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Sexo</span>
              <select name="sexo" required value={form.sexo} onChange={updateField}>
                <option value="">Seleccionar</option>
                <option value="F">F</option>
                <option value="M">M</option>
                <option value="X">X</option>
              </select>
            </label>
          </>
        ) : (
          <>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Razón social</span>
              <input name="razonSocial" required value={form.razonSocial} onChange={updateField} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Nombre de fantasía</span>
              <input name="nombreFantasia" value={form.nombreFantasia} onChange={updateField} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Tipo societario</span>
              <select name="tipoSocietario" required value={form.tipoSocietario} onChange={updateField}>
                <option value="">Seleccionar</option>
                <option value="SA">SA</option>
                <option value="SRL">SRL</option>
                <option value="SAS">SAS</option>
                <option value="COOPERATIVA">Cooperativa</option>
              </select>
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Fecha de constitución</span>
              <input name="fechaConstitucion" type="date" required value={form.fechaConstitucion} onChange={updateField} />
            </label>

            <div className="col-12 representative-section">
              <h2>Representante</h2>
              <p className="muted">Buscá una persona física existente por su nombre.</p>
              <ApiErrorMessage error={peopleError} />
              <ApiErrorMessage error={representativeError} />
              <div className="form-grid">
                <label className="col-12 col-md-6 field">
                  <span>Buscar por nombre</span>
                  <input
                    type="search"
                    value={representativeSearch}
                    onChange={(event) => setRepresentativeSearch(event.target.value)}
                  />
                </label>
                <label className="col-12 col-md-6 field">
                  <span>Persona física existente</span>
                  <select
                    value={representative.id}
                    onChange={selectRepresentative}
                    required
                    disabled={peopleLoading || loadingRepresentative || Boolean(peopleError)}
                  >
                    <option value="">
                      {peopleLoading ? 'Cargando personas…' : 'Seleccionar'}
                    </option>
                    {filteredPeople.map((person) => (
                      <option key={person.id} value={person.id}>{person.nombre}</option>
                    ))}
                  </select>
                  {!peopleLoading && !peopleError && filteredPeople.length === 0 && (
                    <small className="field-hint">No hay personas físicas que coincidan.</small>
                  )}
                </label>
                <label className="col-12 col-md-6 field">
                  <span>Cargo</span>
                  <input
                    required
                    value={representative.cargo}
                    onChange={(event) => setRepresentative((current) => ({ ...current, cargo: event.target.value }))}
                  />
                </label>
                <label className="col-12 col-md-6 field">
                  <span>Fecha desde</span>
                  <input
                    type="date"
                    required
                    value={representative.fechaDesde}
                    onChange={(event) => setRepresentative((current) => ({ ...current, fechaDesde: event.target.value }))}
                  />
                </label>
                <label className="col-12 col-md-6 field">
                  <span>Fecha hasta (opcional)</span>
                  <input
                    type="date"
                    min={representative.fechaDesde || undefined}
                    value={representative.fechaHasta}
                    onChange={(event) => setRepresentative((current) => ({ ...current, fechaHasta: event.target.value }))}
                  />
                </label>
                <label className="col-12 col-md-6 field">
                  <span>Documentación de respaldo (opcional)</span>
                  <input
                    value={representative.documentacionRespaldo}
                    onChange={(event) => setRepresentative((current) => ({ ...current, documentacionRespaldo: event.target.value }))}
                  />
                </label>
              </div>
            </div>
          </>
        )}

        <fieldset className="col-12 role-picker">
          <legend>Roles del contacto (opcional)</legend>
          {roles.length === 0 ? (
            <p className="field-hint">No hay roles disponibles en el catálogo.</p>
          ) : (
            <div className="role-options">
              {roles.map((role) => (
                <label key={role.id} className="role-option">
                  <input
                    type="checkbox"
                    value={role.id}
                    checked={selectedRoles.includes(role.id)}
                    onChange={updateRole}
                  />
                  <span>{role.descripcionRol}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="col-12 contact-form-actions">
          <Link className="button button-secondary" to="/contactos">Cancelar</Link>
          <button className="button button-primary" type="submit" disabled={submitting || loadingRepresentative}>
            {submitting ? 'Guardando…' : 'Crear contacto'}
          </button>
        </div>
      </form>
    </section>
  );
}
