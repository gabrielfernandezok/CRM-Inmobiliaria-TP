import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMenu } from '../api/menu.js';
import { getRentalContracts } from '../api/operaciones.js';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';
import { formatAmount, formatDate, formatEnum } from '../utils/format.js';

const CONTRACT_STATES = ['VIGENTE', 'POR_VENCER', 'VENCIDO', 'RENOVADO', 'RESCINDIDO'];

function findContractsProgram(menus) {
  for (const menu of menus) {
    for (const program of menu.programas || []) {
      const path = `/${(program.ruta || '').replace(/^\/+|\/+$/g, '')}`;
      if (path === '/contratos' || path.startsWith('/contratos/')) return program;
    }
  }
  return null;
}

function propertyName(property) {
  if (!property) return '—';
  return `${formatEnum(property.tipoPropiedad)} · ${property.direccion}`;
}

export default function RentalContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [filters, setFilters] = useState({
    estado: '',
    vencimientoDesde: '',
    vencimientoHasta: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuError, setMenuError] = useState(null);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    getMenu()
      .then((menus) => {
        if (active) setPermissions(findContractsProgram(Array.isArray(menus) ? menus : []));
      })
      .catch((requestError) => {
        if (active) setMenuError(requestError);
      })
      .finally(() => {
        if (active) setPermissionsLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!permissionsLoaded || permissions?.puedeVer !== true) {
      if (permissionsLoaded) setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError(null);
    getRentalContracts(filters)
      .then((result) => {
        if (active) setContracts(Array.isArray(result) ? result : []);
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

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CRM</p>
          <h1>Contratos de alquiler</h1>
          <p className="muted">Consultá contratos por estado y vencimiento.</p>
        </div>
        <Link className="button button-secondary" to="/operaciones">Volver a operaciones</Link>
      </div>
      {menuError && <ApiErrorMessage error={menuError} />}
      {permissionsLoaded && !permissions && !menuError && (
        <div className="notice notice-info" role="status">No tenés permisos para consultar contratos.</div>
      )}
      {permissions && !permissions.puedeVer && (
        <div className="notice notice-info" role="status">No tenés permiso para ver contratos.</div>
      )}
      {permissions?.puedeVer && (
        <>
          <ApiErrorMessage error={error} />
          <div className="form-grid contact-filters">
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Estado</span>
              <select name="estado" value={filters.estado} onChange={updateFilter}>
                <option value="">Todos</option>
                {CONTRACT_STATES.map((state) => <option key={state} value={state}>{formatEnum(state)}</option>)}
              </select>
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Vencimiento desde</span>
              <input name="vencimientoDesde" type="date" value={filters.vencimientoDesde} onChange={updateFilter} />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Vencimiento hasta</span>
              <input
                name="vencimientoHasta"
                type="date"
                min={filters.vencimientoDesde || undefined}
                value={filters.vencimientoHasta}
                onChange={updateFilter}
              />
            </label>
          </div>
          {loading ? (
            <p className="muted" role="status">Cargando contratos…</p>
          ) : !error && contracts.length === 0 ? (
            <p className="empty-state">No hay contratos para mostrar con esos filtros.</p>
          ) : !error ? (
            <div className="table-scroll">
              <table className="rental-contract-table">
                <thead>
                  <tr>
                    <th scope="col">Operación</th>
                    <th scope="col">Renovación</th>
                    <th scope="col">Propiedad</th>
                    <th scope="col">Inicio</th>
                    <th scope="col">Vencimiento</th>
                    <th scope="col">Alquiler</th>
                    <th scope="col">Ajuste</th>
                    <th scope="col">Estado</th>
                    <th scope="col">Garantes</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((contract) => (
                    <tr key={contract.id}>
                      <td>#{contract.idOperacion}</td>
                      <td>{contract.nroRenovacion}</td>
                      <td>{propertyName(contract.operacion?.propiedad)}</td>
                      <td>{formatDate(contract.fechaInicio)}</td>
                      <td>{formatDate(contract.fechaVencimiento)}</td>
                      <td>{formatAmount(contract.montoAlquiler, contract.moneda)}</td>
                      <td>{formatEnum(contract.frecuenciaAjuste)} · {formatEnum(contract.indiceAjuste)}</td>
                      <td><span className={`status-badge contract-status-${contract.estado?.toLowerCase()}`}>{formatEnum(contract.estado)}</span></td>
                      <td>{contract.garantes?.length || 0}</td>
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
