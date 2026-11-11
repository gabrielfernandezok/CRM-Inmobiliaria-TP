import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createProperty, getProperty, getPropertyCatalogs, updateProperty } from '../api/propiedades.js';
import { getContacts } from '../api/contactos.js';
import { getMenu } from '../api/menu.js';
import PropertyForm, { emptyPropertyForm, propertyToForm } from '../components/PropertyForm.jsx';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';

function findPropertiesProgram(menus) {
  for (const menu of menus) {
    for (const program of menu.programas || []) {
      const route = `/${(program.ruta || '').replace(/^\/+|\/+$/g, '')}`;
      if (route === '/propiedades' || route.startsWith('/propiedades/')) return program;
    }
  }
  return null;
}

export default function PropertyFormPage({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialValue, setInitialValue] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [characteristics, setCharacteristics] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadForm() {
      setLoading(true);
      setError(null);
      try {
        const menus = await getMenu();
        if (!active) return;
        const program = findPropertiesProgram(Array.isArray(menus) ? menus : []);
        setPermissions(program);
        const permissionFlag = mode === 'edit' ? 'puedeEditar' : 'puedeCrear';
        if (program && program[permissionFlag] !== true) return;

        const [contactRows, catalogs, property] = await Promise.all([
          getContacts({ activo: 'true' }),
          getPropertyCatalogs(),
          mode === 'edit' ? getProperty(id) : Promise.resolve(null),
        ]);
        if (!active) return;
        setContacts(Array.isArray(contactRows) ? contactRows : []);
        setCharacteristics(Array.isArray(catalogs?.caracteristicas) ? catalogs.caracteristicas : []);
        setInitialValue(property ? propertyToForm(property) : emptyPropertyForm());
      } catch (requestError) {
        if (active) setError(requestError);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadForm();
    return () => {
      active = false;
    };
  }, [id, mode]);

  const permissionFlag = mode === 'edit' ? 'puedeEditar' : 'puedeCrear';
  const canSubmit = !permissions || permissions[permissionFlag] === true;

  async function submit(payload) {
    setSubmitting(true);
    setError(null);
    try {
      const result = mode === 'edit'
        ? await updateProperty(id, payload)
        : await createProperty(payload);
      navigate(`/propiedades/${result.id || id}`, {
        replace: true,
        state: { saved: true },
      });
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="muted" role="status">Cargando formulario…</p>;

  return (
    <section className="page-section">
      <p className="eyebrow">Propiedades</p>
      <h1>{mode === 'edit' ? 'Editar propiedad' : 'Nueva propiedad'}</h1>
      {error && <ApiErrorMessage error={error} />}
      {permissions && !canSubmit && (
        <div className="notice notice-info" role="status">
          No tenés permiso para {mode === 'edit' ? 'editar' : 'crear'} propiedades.
        </div>
      )}
      {!permissions && (
        <div className="notice notice-info" role="status">
          No hay permisos específicos de menú para Propiedades; el backend verificará cada acción.
        </div>
      )}
      {initialValue && canSubmit && (
        <>
          <PropertyForm
            key={`${mode}-${id || 'new'}`}
            initialValue={initialValue}
            contacts={contacts}
            characteristics={characteristics}
            onSubmit={submit}
            submitting={submitting}
            submitLabel={mode === 'edit' ? 'Guardar cambios' : 'Crear propiedad'}
            error={null}
          />
          <div className="contact-form-actions">
            <Link className="button button-secondary" to={mode === 'edit' ? `/propiedades/${id}` : '/propiedades'}>
              Cancelar
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
