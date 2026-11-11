import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createContactInteraction,
  createContactSearch,
  deactivateContact,
  getCatalogs,
  getContact,
  getContactInteractions,
  updateContact,
} from '../api/contactos.js';
import { getMenu } from '../api/menu.js';
import { formatDate, formatEnum } from '../utils/format.js';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';

const emptyInteraction = {
  tipoInteraccion: 'SEGUIMIENTO',
  medio: 'LLAMADA',
  resultado: '',
  notas: '',
  proximaAccion: '',
  fechaProxContacto: '',
};

const emptySearch = {
  tipoOperacion: 'COMPRA',
  tipoPropiedad: 'CASA',
  presupuestoMax: '',
  moneda: 'ARS',
  zona: '',
  ambientes: '',
  dormitorios: '',
  antiguedadMax: '',
  requiereCredito: false,
};

function contactProgramPermissions(menus) {
  for (const menu of menus) {
    for (const program of menu.programas || []) {
      const route = `/${(program.ruta || '').replace(/^\/+|\/+$/g, '')}`;
      if (route === '/contactos' || route.startsWith('/contactos/')) return program;
    }
  }
  return null;
}

function contactFormValues(contact) {
  return {
    cuitCuil: contact.cuitCuil || '',
    telefono: contact.telefono || '',
    mail: contact.mail || '',
    domicilio: contact.domicilio || '',
    localidad: contact.localidad || '',
    observaciones: contact.observaciones || '',
    apellido: contact.personaFisica?.apellido || '',
    nombres: contact.personaFisica?.nombres || '',
    dni: contact.personaFisica?.dni || '',
    fechaNac: contact.personaFisica?.fechaNac?.slice(0, 10) || '',
    sexo: contact.personaFisica?.sexo || '',
    razonSocial: contact.personaJuridica?.razonSocial || '',
    nombreFantasia: contact.personaJuridica?.nombreFantasia || '',
    tipoSocietario: contact.personaJuridica?.tipoSocietario || '',
    fechaConstitucion: contact.personaJuridica?.fechaConstitucion?.slice(0, 10) || '',
  };
}

function contactUpdatePayload(contact, form, selectedRoles) {
  const payload = {
    cuitCuil: form.cuitCuil || null,
    telefono: form.telefono || null,
    mail: form.mail || null,
    domicilio: form.domicilio || null,
    localidad: form.localidad || null,
    observaciones: form.observaciones || null,
    roles: selectedRoles,
  };

  if (contact.tipoPersona === 'FISICA') {
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
      nombreFantasia: form.nombreFantasia || null,
      tipoSocietario: form.tipoSocietario,
      fechaConstitucion: form.fechaConstitucion,
    });
  }

  return payload;
}

function interactionPayload(form) {
  return {
    tipoInteraccion: form.tipoInteraccion,
    medio: form.medio,
    resultado: form.resultado,
    ...(form.notas ? { notas: form.notas } : {}),
    ...(form.proximaAccion ? { proximaAccion: form.proximaAccion } : {}),
    ...(form.fechaProxContacto ? { fechaProxContacto: form.fechaProxContacto } : {}),
  };
}

function searchPayload(form, selectedCharacteristics) {
  return {
    tipoOperacion: form.tipoOperacion,
    tipoPropiedad: form.tipoPropiedad,
    presupuestoMax: form.presupuestoMax ? form.presupuestoMax : null,
    moneda: form.presupuestoMax ? form.moneda : null,
    zona: form.zona || null,
    ambientes: form.ambientes ? Number(form.ambientes) : null,
    dormitorios: form.dormitorios ? Number(form.dormitorios) : null,
    antiguedadMax: form.antiguedadMax ? Number(form.antiguedadMax) : null,
    requiereCredito: form.requiereCredito,
    caracteristicas: selectedCharacteristics,
  };
}

export default function ContactDetailPage() {
  const { id } = useParams();
  const [contact, setContact] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [catalogs, setCatalogs] = useState({ roles: [], caracteristicas: [] });
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [catalogError, setCatalogError] = useState(null);
  const [menuError, setMenuError] = useState(null);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedCharacteristics, setSelectedCharacteristics] = useState([]);
  const [interactionForm, setInteractionForm] = useState(emptyInteraction);
  const [searchForm, setSearchForm] = useState(emptySearch);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingInteraction, setSubmittingInteraction] = useState(false);
  const [submittingSearch, setSubmittingSearch] = useState(false);
  const [success, setSuccess] = useState('');
  const canView = permissions?.puedeVer === true;
  const canEdit = permissions?.puedeEditar === true;
  const canCreate = permissions?.puedeCrear === true;
  const canDelete = permissions?.puedeEliminar === true;

  const loadContact = useCallback(async () => {
    const result = await getContact(id);
    setContact(result);
    setForm(contactFormValues(result));
    setSelectedRoles((result.roles || []).map(({ idRol, rol }) => idRol ?? rol?.id).filter(Boolean));
  }, [id]);

  const loadInteractions = useCallback(async () => {
    try {
      const result = await getContactInteractions(id);
      setInteractions(Array.isArray(result) ? result : []);
      setHistoryError(null);
    } catch (requestError) {
      setHistoryError(requestError);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    async function loadPage() {
      setLoading(true);
      setPermissionsLoading(true);
      setError(null);
      try {
        const contactResult = await getContact(id);
        if (!active) return;
        setContact(contactResult);
        setForm(contactFormValues(contactResult));
        setSelectedRoles(
          (contactResult.roles || [])
            .map(({ idRol, rol }) => idRol ?? rol?.id)
            .filter(Boolean)
        );
      } catch (requestError) {
        if (active) setError(requestError);
      } finally {
        if (active) setLoading(false);
      }

      const [menuResult, catalogResult] = await Promise.allSettled([getMenu(), getCatalogs()]);
      if (!active) return;
      if (menuResult.status === 'fulfilled') {
        setPermissions(contactProgramPermissions(Array.isArray(menuResult.value) ? menuResult.value : []));
        setMenuError(null);
      } else {
        setPermissions(null);
        setMenuError(menuResult.reason);
      }
      if (catalogResult.status === 'fulfilled') {
        setCatalogs({
          roles: Array.isArray(catalogResult.value?.roles) ? catalogResult.value.roles : [],
          caracteristicas: Array.isArray(catalogResult.value?.caracteristicas)
            ? catalogResult.value.caracteristicas
            : [],
        });
        setCatalogError(null);
      } else {
        setCatalogError(catalogResult.reason);
      }
      setPermissionsLoading(false);
    }
    loadPage();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!contact || !canView) return;
    loadInteractions();
  }, [contact, canView, loadInteractions]);

  const representativeRows = useMemo(() => {
    return (contact?.personaJuridica?.representantes || []).map((item) => ({
      ...item,
      person: item.personaFisica,
    }));
  }, [contact]);
  const representedCompanies = useMemo(
    () => contact?.personaFisica?.representantes || [],
    [contact]
  );

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function toggleRole(event) {
    const roleId = Number(event.target.value);
    setSelectedRoles((current) =>
      event.target.checked
        ? [...current, roleId]
        : current.filter((value) => value !== roleId)
    );
  }

  function toggleCharacteristic(event) {
    const characteristicId = Number(event.target.value);
    setSelectedCharacteristics((current) =>
      event.target.checked
        ? [...current, characteristicId]
        : current.filter((value) => value !== characteristicId)
    );
  }

  async function saveContact(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess('');
    try {
      await updateContact(id, contactUpdatePayload(contact, form, selectedRoles));
      await loadContact();
      setEditing(false);
      setSuccess('Los cambios del contacto se guardaron.');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!window.confirm('¿Dar de baja este contacto? Esta acción lo marcará como inactivo.')) return;
    setError(null);
    setSuccess('');
    try {
      await deactivateContact(id);
      setContact((current) => ({ ...current, activo: false }));
      setSuccess('El contacto fue dado de baja.');
    } catch (requestError) {
      setError(requestError);
    }
  }

  async function submitInteraction(event) {
    event.preventDefault();
    setSubmittingInteraction(true);
    setError(null);
    setSuccess('');
    try {
      await createContactInteraction(id, interactionPayload(interactionForm));
      setInteractionForm(emptyInteraction);
      await loadInteractions();
      setSuccess('La interacción quedó registrada.');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmittingInteraction(false);
    }
  }

  async function submitSearch(event) {
    event.preventDefault();
    setSubmittingSearch(true);
    setError(null);
    setSuccess('');
    try {
      await createContactSearch(id, searchPayload(searchForm, selectedCharacteristics));
      setSearchForm(emptySearch);
      setSelectedCharacteristics([]);
      setSuccess('La búsqueda quedó registrada.');
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmittingSearch(false);
    }
  }

  if (loading) {
    return <p className="muted" role="status">Cargando ficha del contacto…</p>;
  }

  if (error && !contact) {
    return (
      <section className="page-section">
        <ApiErrorMessage error={error} />
        <Link className="button button-secondary" to="/contactos">Volver a contactos</Link>
      </section>
    );
  }

  if (!contact) return null;

  const contactName =
    contact.nombre ||
    (contact.tipoPersona === 'FISICA'
      ? `${contact.personaFisica?.apellido || ''} ${contact.personaFisica?.nombres || ''}`.trim()
      : contact.personaJuridica?.razonSocial) ||
    'Contacto';

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Ficha del contacto</p>
          <h1>{contactName}</h1>
          <p className="muted">
            {contact.tipoPersona === 'FISICA' ? 'Persona física' : 'Persona jurídica'}
            {' · '}
            {contact.activo ? 'Activo' : 'Inactivo'}
          </p>
        </div>
        <Link className="button button-secondary" to="/contactos">Volver a contactos</Link>
      </div>

      <ApiErrorMessage error={error} />
      {success && <div className="notice notice-success" role="status">{success}</div>}
      {menuError && <ApiErrorMessage error={menuError} />}
      {permissions && !canView && (
        <div className="notice notice-info" role="status">
          La API no habilitó la visualización del programa Contactos para este usuario.
        </div>
      )}
      {!permissionsLoading && !permissions && !menuError && (
        <div className="notice notice-info" role="status">
          La API no devolvió permisos de menú para Contactos. La ficha es de solo lectura y las acciones están ocultas.
        </div>
      )}

      <section className="contact-card">
        <div className="contact-card-heading">
          <h2>Datos del contacto</h2>
          <div className="contact-actions">
            {canEdit && !editing && (
              <button className="button button-secondary" type="button" onClick={() => setEditing(true)}>
                Editar
              </button>
            )}
            {canDelete && contact.activo && !editing && (
              <button className="button button-danger" type="button" onClick={handleDeactivate}>
                Dar de baja
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <form className="form-grid contact-form" onSubmit={saveContact}>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>CUIT / CUIL</span>
              <input name="cuitCuil" value={form.cuitCuil} onChange={updateForm} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Teléfono</span>
              <input name="telefono" type="tel" value={form.telefono} onChange={updateForm} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Correo electrónico</span>
              <input name="mail" type="email" value={form.mail} onChange={updateForm} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Domicilio</span>
              <input name="domicilio" value={form.domicilio} onChange={updateForm} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Localidad</span>
              <input name="localidad" value={form.localidad} onChange={updateForm} />
            </label>
            {contact.tipoPersona === 'FISICA' ? (
              <>
                <label className="col-12 col-md-6 col-lg-4 field">
                  <span>Apellido</span>
                  <input name="apellido" required value={form.apellido} onChange={updateForm} />
                </label>
                <label className="col-12 col-md-6 col-lg-4 field">
                  <span>Nombres</span>
                  <input name="nombres" required value={form.nombres} onChange={updateForm} />
                </label>
                <label className="col-12 col-md-6 col-lg-4 field">
                  <span>DNI</span>
                  <input name="dni" type="number" min="1" step="1" required value={form.dni} onChange={updateForm} />
                </label>
                <label className="col-12 col-md-6 col-lg-4 field">
                  <span>Fecha de nacimiento</span>
                  <input name="fechaNac" type="date" required value={form.fechaNac} onChange={updateForm} />
                </label>
                <label className="col-12 col-md-6 col-lg-4 field">
                  <span>Sexo</span>
                  <select name="sexo" required value={form.sexo} onChange={updateForm}>
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
                  <input name="razonSocial" required value={form.razonSocial} onChange={updateForm} />
                </label>
                <label className="col-12 col-md-6 col-lg-4 field">
                  <span>Nombre de fantasía</span>
                  <input name="nombreFantasia" value={form.nombreFantasia} onChange={updateForm} />
                </label>
                <label className="col-12 col-md-6 col-lg-4 field">
                  <span>Tipo societario</span>
                  <select name="tipoSocietario" required value={form.tipoSocietario} onChange={updateForm}>
                    <option value="SA">SA</option>
                    <option value="SRL">SRL</option>
                    <option value="SAS">SAS</option>
                    <option value="COOPERATIVA">Cooperativa</option>
                  </select>
                </label>
                <label className="col-12 col-md-6 col-lg-4 field">
                  <span>Fecha de constitución</span>
                  <input name="fechaConstitucion" type="date" required value={form.fechaConstitucion} onChange={updateForm} />
                </label>
              </>
            )}
            <label className="col-12 field">
              <span>Observaciones</span>
              <textarea name="observaciones" rows="3" value={form.observaciones} onChange={updateForm} />
            </label>
            <fieldset className="col-12 role-picker">
              <legend>Roles</legend>
              <div className="role-options">
                {catalogs.roles.map((role) => (
                  <label key={role.id} className="role-option">
                    <input
                      type="checkbox"
                      value={role.id}
                      checked={selectedRoles.includes(role.id)}
                      onChange={toggleRole}
                    />
                    <span>{role.descripcionRol}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="col-12 contact-form-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => {
                  setForm(contactFormValues(contact));
                  setSelectedRoles((contact.roles || []).map(({ idRol, rol }) => idRol ?? rol?.id).filter(Boolean));
                  setEditing(false);
                }}
              >
                Cancelar
              </button>
              <button className="button button-primary" type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        ) : (
          <dl className="contact-details">
            <div><dt>CUIT / CUIL</dt><dd>{contact.cuitCuil || '—'}</dd></div>
            <div><dt>Correo</dt><dd>{contact.mail || '—'}</dd></div>
            <div><dt>Teléfono</dt><dd>{contact.telefono || '—'}</dd></div>
            <div><dt>Domicilio</dt><dd>{contact.domicilio || '—'}</dd></div>
            <div><dt>Localidad</dt><dd>{contact.localidad || '—'}</dd></div>
            <div><dt>Fecha de alta</dt><dd>{formatDate(contact.fechaAlta)}</dd></div>
            {contact.personaFisica && (
              <>
                <div><dt>DNI</dt><dd>{contact.personaFisica.dni}</dd></div>
                <div><dt>Fecha de nacimiento</dt><dd>{formatDate(contact.personaFisica.fechaNac)}</dd></div>
                <div><dt>Sexo</dt><dd>{contact.personaFisica.sexo}</dd></div>
              </>
            )}
            {contact.personaJuridica && (
              <>
                <div><dt>Nombre de fantasía</dt><dd>{contact.personaJuridica.nombreFantasia || '—'}</dd></div>
                <div><dt>Tipo societario</dt><dd>{formatEnum(contact.personaJuridica.tipoSocietario)}</dd></div>
                <div><dt>Fecha de constitución</dt><dd>{formatDate(contact.personaJuridica.fechaConstitucion)}</dd></div>
              </>
            )}
            <div className="contact-detail-wide">
              <dt>Roles</dt>
              <dd>{(contact.roles || []).map(({ rol }) => rol?.descripcionRol).filter(Boolean).join(', ') || '—'}</dd>
            </div>
            <div className="contact-detail-wide">
              <dt>Observaciones</dt>
              <dd>{contact.observaciones || '—'}</dd>
            </div>
          </dl>
        )}

        {representativeRows.length > 0 && (
          <div className="contact-related">
            <h3>Representantes</h3>
            <ul>
              {representativeRows.map((item, index) => (
                <li key={`${item.idPersonaFisica || index}-${index}`}>
                  <strong>{`${item.person?.apellido || ''} ${item.person?.nombres || ''}`.trim() || 'Persona física'}</strong>
                  {' · '}{item.cargo}
                  {item.esPrincipal ? ' · Principal' : ''}
                  {' · Desde '}{formatDate(item.fechaDesde)}
                  {item.fechaHasta ? ` · Hasta ${formatDate(item.fechaHasta)}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
        {representedCompanies.length > 0 && (
          <div className="contact-related">
            <h3>Empresas representadas</h3>
            <ul>
              {representedCompanies.map((item, index) => (
                <li key={`${item.idPersonaJuridica}-${index}`}>
                  <strong>
                    {item.personaJuridica?.razonSocial ||
                      `Empresa #${item.idPersonaJuridica}`}
                  </strong>
                  {' · '}{item.cargo}
                  {item.esPrincipal ? ' · Principal' : ''}
                  {' · Desde '}{formatDate(item.fechaDesde)}
                  {item.fechaHasta ? ` · Hasta ${formatDate(item.fechaHasta)}` : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="contact-card">
        <div className="contact-card-heading">
          <div>
            <h2>Historial de interacciones</h2>
            <p className="muted">Ordenado por fecha, según la API.</p>
          </div>
        </div>
        {canView ? (
          <>
            <ApiErrorMessage error={historyError} />
            {interactions.length === 0 && !historyError ? (
              <p className="empty-state">Todavía no hay interacciones registradas.</p>
            ) : (
              <div className="interaction-list">
                {interactions.map((interaction) => (
                  <article className="interaction-item" key={interaction.id}>
                    <div className="interaction-item-heading">
                      <strong>{formatEnum(interaction.tipoInteraccion)} · {formatEnum(interaction.medio)}</strong>
                      <time>{formatDate(interaction.fecha)}</time>
                    </div>
                    <p>{interaction.resultado}</p>
                    {interaction.notas && <p className="muted">{interaction.notas}</p>}
                    {interaction.proximaAccion && (
                      <p><strong>Próxima acción:</strong> {interaction.proximaAccion}</p>
                    )}
                    {interaction.fechaProxContacto && (
                      <p><strong>Próximo contacto:</strong> {formatDate(interaction.fechaProxContacto)}</p>
                    )}
                    <small className="field-hint">Registró: {interaction.usuario?.nombreUsuario || '—'}</small>
                  </article>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="muted">El permiso de visualización del menú no habilita consultar el historial.</p>
        )}
      </section>

      {canCreate && (
        <>
          <section className="contact-card">
            <h2>Registrar interacción</h2>
            <form className="form-grid contact-form" onSubmit={submitInteraction}>
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Tipo</span>
                <select
                  value={interactionForm.tipoInteraccion}
                  onChange={(event) => setInteractionForm((current) => ({ ...current, tipoInteraccion: event.target.value }))}
                >
                  <option value="SEGUIMIENTO">Seguimiento</option>
                  <option value="ENTREVISTA_CAPTACION">Entrevista de captación</option>
                </select>
              </label>
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Medio</span>
                <select
                  value={interactionForm.medio}
                  onChange={(event) => setInteractionForm((current) => ({ ...current, medio: event.target.value }))}
                >
                  <option value="LLAMADA">Llamada</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="MAIL">Correo</option>
                  <option value="EN_PERSONA">En persona</option>
                </select>
              </label>
              <label className="col-12 field">
                <span>Resultado</span>
                <input
                  required
                  value={interactionForm.resultado}
                  onChange={(event) => setInteractionForm((current) => ({ ...current, resultado: event.target.value }))}
                />
              </label>
              <label className="col-12 field">
                <span>Notas (opcional)</span>
                <textarea
                  rows="3"
                  value={interactionForm.notas}
                  onChange={(event) => setInteractionForm((current) => ({ ...current, notas: event.target.value }))}
                />
              </label>
              <label className="col-12 col-md-6 field">
                <span>Próxima acción (opcional)</span>
                <input
                  value={interactionForm.proximaAccion}
                  onChange={(event) => setInteractionForm((current) => ({ ...current, proximaAccion: event.target.value }))}
                />
              </label>
              <label className="col-12 col-md-6 field">
                <span>Fecha de próximo contacto (opcional)</span>
                <input
                  type="date"
                  value={interactionForm.fechaProxContacto}
                  onChange={(event) => setInteractionForm((current) => ({ ...current, fechaProxContacto: event.target.value }))}
                />
              </label>
              <div className="col-12 contact-form-actions">
                <button className="button button-primary" type="submit" disabled={submittingInteraction}>
                  {submittingInteraction ? 'Registrando…' : 'Registrar interacción'}
                </button>
              </div>
            </form>
          </section>

          <section className="contact-card">
            <h2>Registrar búsqueda</h2>
            <form className="form-grid contact-form" onSubmit={submitSearch}>
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Operación</span>
                <select
                  value={searchForm.tipoOperacion}
                  onChange={(event) => setSearchForm((current) => ({ ...current, tipoOperacion: event.target.value }))}
                >
                  <option value="COMPRA">Compra</option>
                  <option value="ALQUILER">Alquiler</option>
                </select>
              </label>
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Tipo de propiedad</span>
                <select
                  value={searchForm.tipoPropiedad}
                  onChange={(event) => setSearchForm((current) => ({ ...current, tipoPropiedad: event.target.value }))}
                >
                  <option value="CASA">Casa</option>
                  <option value="DEPARTAMENTO">Departamento</option>
                  <option value="TERRENO">Terreno</option>
                  <option value="LOCAL">Local</option>
                  <option value="OFICINA">Oficina</option>
                </select>
              </label>
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Presupuesto máximo (opcional)</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={searchForm.presupuestoMax}
                  onChange={(event) => setSearchForm((current) => ({ ...current, presupuestoMax: event.target.value }))}
                />
              </label>
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Moneda</span>
                <select
                  value={searchForm.moneda}
                  onChange={(event) => setSearchForm((current) => ({ ...current, moneda: event.target.value }))}
                  disabled={!searchForm.presupuestoMax}
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Zona (opcional)</span>
                <input
                  value={searchForm.zona}
                  onChange={(event) => setSearchForm((current) => ({ ...current, zona: event.target.value }))}
                />
              </label>
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Ambientes (opcional)</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={searchForm.ambientes}
                  onChange={(event) => setSearchForm((current) => ({ ...current, ambientes: event.target.value }))}
                />
              </label>
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Dormitorios (opcional)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={searchForm.dormitorios}
                  onChange={(event) => setSearchForm((current) => ({ ...current, dormitorios: event.target.value }))}
                />
              </label>
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Antigüedad máxima en años (opcional)</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={searchForm.antiguedadMax}
                  onChange={(event) => setSearchForm((current) => ({ ...current, antiguedadMax: event.target.value }))}
                />
              </label>
              <label className="col-12 role-option">
                <input
                  type="checkbox"
                  checked={searchForm.requiereCredito}
                  onChange={(event) => setSearchForm((current) => ({ ...current, requiereCredito: event.target.checked }))}
                />
                <span>Requiere crédito</span>
              </label>
              {catalogs.caracteristicas.length > 0 && (
                <fieldset className="col-12 role-picker">
                  <legend>Características</legend>
                  <div className="role-options">
                    {catalogs.caracteristicas.map((item) => (
                      <label key={item.id} className="role-option">
                        <input
                          type="checkbox"
                          value={item.id}
                          checked={selectedCharacteristics.includes(item.id)}
                          onChange={toggleCharacteristic}
                        />
                        <span>{item.descripcion}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              {catalogError && <div className="col-12"><ApiErrorMessage error={catalogError} /></div>}
              <div className="col-12 contact-form-actions">
                <button className="button button-primary" type="submit" disabled={submittingSearch}>
                  {submittingSearch ? 'Registrando…' : 'Registrar búsqueda'}
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </section>
  );
}
