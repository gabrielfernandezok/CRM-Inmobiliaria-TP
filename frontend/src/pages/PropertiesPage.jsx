import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProperties } from '../api/propiedades.js';
import { getMenu } from '../api/menu.js';
import { formatDate, formatEnum } from '../utils/format.js';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';
import { PROPERTY_STATES, PROPERTY_TYPES } from '../components/PropertyForm.jsx';

function findPropertiesProgram(menus) {
  for (const menu of menus) {
    for (const program of menu.programas || []) {
      const route = `/${(program.ruta || '').replace(/^\/+|\/+$/g, '')}`;
      if (route === '/propiedades' || route.startsWith('/propiedades/')) return program;
    }
  }
  return null;
}

export default function PropertiesPage() {
  const [filters, setFilters] = useState({ tipoPropiedad: '', estado: '', localidad: '' });
  const [properties, setProperties] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuError, setMenuError] = useState(null);

  useEffect(() => {
    let active = true;
    getMenu()
      .then((menus) => {
        if (active) setPermissions(findPropertiesProgram(Array.isArray(menus) ? menus : []));
      })
      .catch((requestError) => {
        if (active) {
          setPermissions(null);
          setMenuError(requestError);
        }
      })
      .finally(() => {
        if (active) {
          setPermissionsLoaded(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!permissionsLoaded) return undefined;
    if (!permissions?.puedeVer) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError(null);
    getProperties(filters)
      .then((result) => {
        if (active) setProperties(Array.isArray(result) ? result : []);
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
  }, [filters, permissions, permissionsLoaded]);

  const canView = permissionsLoaded && permissions?.puedeVer === true;
  const canCreate = permissionsLoaded && permissions?.puedeCrear === true;

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CRM</p>
          <h1>Propiedades</h1>
          <p className="muted">Administrá las propiedades de la inmobiliaria.</p>
        </div>
        {canCreate && <Link className="button button-primary" to="/propiedades/nueva">Nueva propiedad</Link>}
      </div>
      {menuError && <ApiErrorMessage error={menuError} />}
      {permissions && !permissions.puedeVer && (
        <div className="notice notice-info" role="status">No tenés permiso para ver propiedades.</div>
      )}
      {!permissionsLoaded && <p className="muted" role="status">Cargando permisos…</p>}
      {permissionsLoaded && !permissions && !menuError && (
        <div className="notice notice-info" role="status">
          No hay permisos configurados para Propiedades. Pedile a un administrador que revise el perfil.
        </div>
      )}
      {!canView ? null : (
        <>
          <ApiErrorMessage error={error} />
          <div className="form-grid contact-filters">
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Tipo de propiedad</span>
              <select name="tipoPropiedad" value={filters.tipoPropiedad} onChange={updateFilter}>
                <option value="">Todos</option>
                {PROPERTY_TYPES.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
              </select>
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Estado</span>
              <select name="estado" value={filters.estado} onChange={updateFilter}>
                <option value="">Todos</option>
                {PROPERTY_STATES.map((state) => <option key={state} value={state}>{formatEnum(state)}</option>)}
              </select>
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Localidad</span>
              <input name="localidad" value={filters.localidad} onChange={updateFilter} />
            </label>
          </div>
          {loading ? (
            <p className="muted" role="status">Cargando propiedades…</p>
          ) : !error && properties.length === 0 ? (
            <p className="empty-state">No se encontraron propiedades con esos filtros.</p>
          ) : !error ? (
            <div className="table-scroll">
              <table className="properties-table">
                <thead>
                  <tr>
                    <th scope="col">Dirección</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Localidad</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Superficie</th>
                    <th scope="col">Alta</th>
                  </tr>
                </thead>
                <tbody>
                  {properties.map((property) => (
                    <tr key={property.id}>
                      <td><Link to={`/propiedades/${property.id}`}>{property.direccion}</Link></td>
                      <td>{formatEnum(property.tipoPropiedad)}</td>
                      <td>{property.localidad || '—'}</td>
                      <td>{formatEnum(property.estado)}</td>
                      <td>{property.superficie == null ? '—' : `${property.superficie} m²`}</td>
                      <td>{formatDate(property.fechaAlta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
