import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  changeOperationStage,
  createOperation,
  createOffer,
  createRentalContract,
  getOperationCatalogs,
  getOperationContacts,
  getOperations,
} from '../api/operaciones.js';
import { getMenu } from '../api/menu.js';
import { getProperties } from '../api/propiedades.js';
import ApiErrorMessage from '../components/ApiErrorMessage.jsx';
import { formatAmount, formatDate, formatEnum } from '../utils/format.js';

const CONTRACT_STATES = ['VIGENTE', 'POR_VENCER', 'VENCIDO', 'RENOVADO', 'RESCINDIDO'];
const ADJUSTMENT_FREQUENCIES = ['TRIMESTRAL', 'SEMESTRAL', 'ANUAL'];
const ADJUSTMENT_INDICES = ['IPC', 'ICL', 'PORCENTAJE_FIJO', 'MONTO_FIJO'];
const OFFER_STATES = ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CONTRAOFERTA'];

const initialOperationForm = {
  idPropiedad: '',
  idCliente: '',
  tipoOperacion: 'VENTA',
  idEtapa: '',
  idMotivoBaja: '',
  precioUSD: '',
  precioARS: '',
  valorSugerido: '',
  esExclusiva: false,
  fechaFirmaAutorizacion: '',
  fechaVencAutorizacion: '',
};

const emptyOffer = {
  idContacto: '',
  monto: '',
  moneda: 'ARS',
  fecha: new Date().toISOString().slice(0, 10),
  estado: 'PENDIENTE',
};

const emptyContract = {
  fechaFirma: '',
  fechaInicio: '',
  fechaVencimiento: '',
  montoAlquiler: '',
  moneda: 'ARS',
  frecuenciaAjuste: 'TRIMESTRAL',
  indiceAjuste: 'IPC',
  depositoGarantia: '',
  diasAviso: '30',
  estado: 'VIGENTE',
  fechaRescision: '',
  garantes: [],
};

function findProgram(menus, route) {
  for (const menu of menus) {
    for (const program of menu.programas || []) {
      const path = `/${(program.ruta || '').replace(/^\/+|\/+$/g, '')}`;
      if (path === route || path.startsWith(`${route}/`)) return program;
    }
  }
  return null;
}

function contactName(contact) {
  if (!contact) return '—';
  return contact.nombre ||
    (contact.personaFisica
      ? `${contact.personaFisica.apellido} ${contact.personaFisica.nombres}`.trim()
      : contact.personaJuridica?.razonSocial) ||
    `Contacto #${contact.id}`;
}

function propertyName(property) {
  if (!property) return '—';
  return `${formatEnum(property.tipoPropiedad)} · ${property.direccion}`;
}

function isDropStage(stage) {
  const normalized = (stage?.descripcion || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return /baja|caid|cancel|desist|perdid|no concret|fracas|fallid/i.test(normalized);
}

function OperationActions({
  operation,
  stages,
  dropReasons,
  contacts,
  permissions,
  contractPermissions,
  onChanged,
}) {
  const [stageForm, setStageForm] = useState({
    idEtapa: String(operation.idEtapa || operation.etapa?.id || ''),
    idMotivoBaja: '',
    fechaCierre: '',
  });
  const [offerForm, setOfferForm] = useState(emptyOffer);
  const [contractForm, setContractForm] = useState(emptyContract);
  const [activeAction, setActiveAction] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const selectedStage = stages.find((stage) => stage.id === Number(stageForm.idEtapa));
  const requiresDropReason = isDropStage(selectedStage);
  const canEdit = permissions?.puedeEditar === true;
  const canCreate = permissions?.puedeCrear === true;
  const canCreateContract = contractPermissions?.puedeCrear === true;

  useEffect(() => {
    setStageForm((current) => ({
      ...current,
      idEtapa: String(operation.idEtapa || operation.etapa?.id || ''),
      idMotivoBaja: '',
    }));
  }, [operation.idEtapa, operation.etapa?.id]);

  function updateStage(event) {
    const { name, value } = event.target;
    setStageForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'idEtapa' ? { idMotivoBaja: '' } : {}),
    }));
  }

  async function submitStage(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess('');
    try {
      await changeOperationStage(operation.id, {
        idEtapa: Number(stageForm.idEtapa),
        ...(requiresDropReason ? { idMotivoBaja: Number(stageForm.idMotivoBaja) } : {}),
        ...(stageForm.fechaCierre ? { fechaCierre: stageForm.fechaCierre } : {}),
      });
      setSuccess('La etapa de la operación se actualizó.');
      await onChanged();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitOffer(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess('');
    try {
      await createOffer(operation.id, {
        idContacto: Number(offerForm.idContacto),
        monto: offerForm.monto,
        moneda: offerForm.moneda,
        fecha: offerForm.fecha,
        estado: offerForm.estado,
      });
      setOfferForm(emptyOffer);
      setSuccess('La oferta quedó registrada.');
      setActiveAction('');
      await onChanged();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitContract(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess('');
    try {
      await createRentalContract(operation.id, {
        fechaFirma: contractForm.fechaFirma,
        fechaInicio: contractForm.fechaInicio,
        fechaVencimiento: contractForm.fechaVencimiento,
        montoAlquiler: contractForm.montoAlquiler,
        moneda: contractForm.moneda,
        frecuenciaAjuste: contractForm.frecuenciaAjuste,
        indiceAjuste: contractForm.indiceAjuste,
        depositoGarantia: contractForm.depositoGarantia,
        diasAviso: Number(contractForm.diasAviso),
        estado: contractForm.estado,
        fechaRescision: contractForm.fechaRescision || null,
        garantes: contractForm.garantes,
      });
      setContractForm(emptyContract);
      setSuccess('El contrato de alquiler quedó registrado.');
      setActiveAction('');
      await onChanged();
    } catch (requestError) {
      setError(requestError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="operation-actions">
      {error && <ApiErrorMessage error={error} />}
      {success && <div className="notice notice-success" role="status">{success}</div>}
      <div className="contact-actions">
        {canEdit && (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setActiveAction(activeAction === 'stage' ? '' : 'stage')}
          >
            Cambiar etapa
          </button>
        )}
        {canCreate && (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setActiveAction(activeAction === 'offer' ? '' : 'offer')}
          >
            Registrar oferta
          </button>
        )}
        {canCreateContract && operation.tipoOperacion === 'ALQUILER' && (
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setActiveAction(activeAction === 'contract' ? '' : 'contract')}
          >
            Crear contrato
          </button>
        )}
      </div>

      {activeAction === 'stage' && canEdit && (
        <form className="form-grid action-form" onSubmit={submitStage}>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Nueva etapa</span>
            <select name="idEtapa" required value={stageForm.idEtapa} onChange={updateStage}>
              <option value="">Seleccionar</option>
              {stages
                .filter((stage) => stage.tipoOperacion === 'AMBAS' || stage.tipoOperacion === operation.tipoOperacion)
                .map((stage) => <option key={stage.id} value={stage.id}>{stage.descripcion}</option>)}
            </select>
          </label>
          {requiresDropReason && (
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Motivo de baja</span>
              <select
                required
                value={stageForm.idMotivoBaja}
                onChange={(event) => setStageForm((current) => ({ ...current, idMotivoBaja: event.target.value }))}
              >
                <option value="">Seleccionar motivo</option>
                {dropReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.descripcion}</option>)}
              </select>
            </label>
          )}
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Fecha de cierre (opcional)</span>
            <input name="fechaCierre" type="date" value={stageForm.fechaCierre} onChange={updateStage} />
          </label>
          <div className="col-12 contact-form-actions">
            <button className="button button-primary" type="submit" disabled={submitting || !stageForm.idEtapa || (requiresDropReason && !stageForm.idMotivoBaja)}>
              {submitting ? 'Guardando…' : 'Guardar etapa'}
            </button>
          </div>
        </form>
      )}

      {activeAction === 'offer' && canCreate && (
        <form className="form-grid action-form" onSubmit={submitOffer}>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Contacto</span>
            <select required value={offerForm.idContacto} onChange={(event) => setOfferForm((current) => ({ ...current, idContacto: event.target.value }))}>
              <option value="">Seleccionar contacto</option>
              {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contactName(contact)}</option>)}
            </select>
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Monto</span>
            <input type="number" min="0" step="any" required value={offerForm.monto} onChange={(event) => setOfferForm((current) => ({ ...current, monto: event.target.value }))} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Moneda</span>
            <select value={offerForm.moneda} onChange={(event) => setOfferForm((current) => ({ ...current, moneda: event.target.value }))}>
              <option value="ARS">ARS</option><option value="USD">USD</option>
            </select>
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Fecha</span>
            <input type="date" required value={offerForm.fecha} onChange={(event) => setOfferForm((current) => ({ ...current, fecha: event.target.value }))} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Estado</span>
            <select value={offerForm.estado} onChange={(event) => setOfferForm((current) => ({ ...current, estado: event.target.value }))}>
              {OFFER_STATES.map((state) => <option key={state} value={state}>{formatEnum(state)}</option>)}
            </select>
          </label>
          <div className="col-12 contact-form-actions">
            <button className="button button-primary" type="submit" disabled={submitting || contacts.length === 0}>
              {submitting ? 'Registrando…' : 'Guardar oferta'}
            </button>
          </div>
        </form>
      )}

      {activeAction === 'contract' && canCreateContract && operation.tipoOperacion === 'ALQUILER' && (
        <form className="form-grid action-form" onSubmit={submitContract}>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Fecha de firma</span>
            <input type="date" required value={contractForm.fechaFirma} onChange={(event) => setContractForm((current) => ({ ...current, fechaFirma: event.target.value }))} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Inicio</span>
            <input type="date" required value={contractForm.fechaInicio} onChange={(event) => setContractForm((current) => ({ ...current, fechaInicio: event.target.value }))} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Vencimiento</span>
            <input type="date" min={contractForm.fechaInicio || undefined} required value={contractForm.fechaVencimiento} onChange={(event) => setContractForm((current) => ({ ...current, fechaVencimiento: event.target.value }))} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Monto de alquiler</span>
            <input type="number" min="0" step="any" required value={contractForm.montoAlquiler} onChange={(event) => setContractForm((current) => ({ ...current, montoAlquiler: event.target.value }))} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Moneda</span>
            <select value={contractForm.moneda} onChange={(event) => setContractForm((current) => ({ ...current, moneda: event.target.value }))}>
              <option value="ARS">ARS</option><option value="USD">USD</option>
            </select>
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Depósito de garantía</span>
            <input type="number" min="0" step="any" required value={contractForm.depositoGarantia} onChange={(event) => setContractForm((current) => ({ ...current, depositoGarantia: event.target.value }))} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Frecuencia de ajuste</span>
            <select value={contractForm.frecuenciaAjuste} onChange={(event) => setContractForm((current) => ({ ...current, frecuenciaAjuste: event.target.value }))}>
              {ADJUSTMENT_FREQUENCIES.map((value) => <option key={value} value={value}>{formatEnum(value)}</option>)}
            </select>
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Índice de ajuste</span>
            <select value={contractForm.indiceAjuste} onChange={(event) => setContractForm((current) => ({ ...current, indiceAjuste: event.target.value }))}>
              {ADJUSTMENT_INDICES.map((value) => <option key={value} value={value}>{formatEnum(value)}</option>)}
            </select>
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Días de aviso</span>
            <input type="number" min="0" step="1" required value={contractForm.diasAviso} onChange={(event) => setContractForm((current) => ({ ...current, diasAviso: event.target.value }))} />
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Estado</span>
            <select value={contractForm.estado} onChange={(event) => setContractForm((current) => ({ ...current, estado: event.target.value }))}>
              {CONTRACT_STATES.map((state) => <option key={state} value={state}>{formatEnum(state)}</option>)}
            </select>
          </label>
          <label className="col-12 col-md-6 col-lg-4 field">
            <span>Fecha de rescisión (opcional)</span>
            <input type="date" value={contractForm.fechaRescision} onChange={(event) => setContractForm((current) => ({ ...current, fechaRescision: event.target.value }))} />
          </label>
          <fieldset className="col-12 role-picker">
            <legend>Garantes (opcional)</legend>
            <div className="role-options">
              {contacts.map((contact) => (
                <label key={contact.id} className="role-option">
                  <input
                    type="checkbox"
                    checked={contractForm.garantes.includes(contact.id)}
                    onChange={(event) => setContractForm((current) => ({
                      ...current,
                      garantes: event.target.checked
                        ? [...current.garantes, contact.id]
                        : current.garantes.filter((id) => id !== contact.id),
                    }))}
                  />
                  <span>{contactName(contact)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="col-12 contact-form-actions">
            <button className="button button-primary" type="submit" disabled={submitting || contacts.length === 0}>
              {submitting ? 'Creando…' : 'Crear contrato'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function OperationsPage() {
  const [operations, setOperations] = useState([]);
  const [properties, setProperties] = useState([]);
  const [stages, setStages] = useState([]);
  const [dropReasons, setDropReasons] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [contractPermissions, setContractPermissions] = useState(null);
  const [filters, setFilters] = useState({ tipoOperacion: '', idEtapa: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [catalogError, setCatalogError] = useState(null);
  const [operationForm, setOperationForm] = useState(initialOperationForm);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creatingOperation, setCreatingOperation] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createSuccess, setCreateSuccess] = useState('');

  const loadOperations = useCallback(async () => {
    const result = await getOperations(filters);
    setOperations(Array.isArray(result) ? result : []);
  }, [filters]);

  useEffect(() => {
    let active = true;
    async function loadPage() {
      setLoading(true);
      try {
        const [menus, catalogs, contactRows, propertyRows] = await Promise.all([
          getMenu(),
          getOperationCatalogs(),
          getOperationContacts(),
          getProperties(),
        ]);
        if (!active) return;
        const menuEntries = Array.isArray(menus) ? menus : [];
        setPermissions(findProgram(menuEntries, '/operaciones'));
        setContractPermissions(findProgram(menuEntries, '/contratos'));
        setStages(Array.isArray(catalogs?.etapas) ? catalogs.etapas : []);
        setDropReasons(Array.isArray(catalogs?.motivosBaja) ? catalogs.motivosBaja : []);
        setContacts(Array.isArray(contactRows) ? contactRows : []);
        setProperties(Array.isArray(propertyRows) ? propertyRows : []);
        const firstStage = (catalogs?.etapas || []).find(
          (stage) => stage.tipoOperacion === 'AMBAS' || stage.tipoOperacion === 'VENTA'
        );
        if (firstStage) {
          setOperationForm((current) => ({ ...current, idEtapa: String(firstStage.id) }));
        }
      } catch (requestError) {
        if (active) setCatalogError(requestError);
      }
    }
    loadPage().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!permissions?.puedeVer) {
      if (permissions) setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError(null);
    getOperations(filters)
      .then((result) => {
        if (active) setOperations(Array.isArray(result) ? result : []);
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
  }, [filters, permissions]);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function updateOperationForm(event) {
    const { name, value, type, checked } = event.target;
    setOperationForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
      ...(name === 'tipoOperacion' ? { idEtapa: '', idMotivoBaja: '' } : {}),
      ...(name === 'idEtapa' ? { idMotivoBaja: '' } : {}),
    }));
  }

  const selectedOperationStage = stages.find(
    (stage) => stage.id === Number(operationForm.idEtapa)
  );
  const operationNeedsDropReason = isDropStage(selectedOperationStage);

  async function submitOperation(event) {
    event.preventDefault();
    setCreatingOperation(true);
    setCreateError(null);
    setCreateSuccess('');
    try {
      await createOperation({
        idPropiedad: Number(operationForm.idPropiedad),
        idEtapa: Number(operationForm.idEtapa),
        ...(operationForm.idCliente ? { idCliente: Number(operationForm.idCliente) } : {}),
        ...(operationNeedsDropReason
          ? { idMotivoBaja: Number(operationForm.idMotivoBaja) }
          : {}),
        tipoOperacion: operationForm.tipoOperacion,
        precioUSD: operationForm.precioUSD || null,
        precioARS: operationForm.precioARS || null,
        valorSugerido: operationForm.valorSugerido || null,
        esExclusiva: operationForm.esExclusiva,
        fechaFirmaAutorizacion: operationForm.fechaFirmaAutorizacion || null,
        fechaVencAutorizacion: operationForm.fechaVencAutorizacion || null,
      });
      setOperationForm((current) => ({
        ...initialOperationForm,
        idEtapa:
          stages.find(
            (stage) =>
              stage.tipoOperacion === 'AMBAS' ||
              stage.tipoOperacion === initialOperationForm.tipoOperacion
          )?.id?.toString() || '',
      }));
      setCreateSuccess('La operación quedó registrada.');
      setShowCreateForm(false);
      try {
        await loadOperations();
      } catch (requestError) {
        setError(requestError);
      }
    } catch (requestError) {
      setCreateError(requestError);
    } finally {
      setCreatingOperation(false);
    }
  }

  if (loading) return <p className="muted" role="status">Cargando operaciones…</p>;

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">CRM</p>
          <h1>Operaciones</h1>
          <p className="muted">Consultá la etapa y gestioná ofertas y contratos.</p>
        </div>
        <div className="contact-actions">
          {permissions?.puedeCrear && (
            <button
              className="button button-primary"
              type="button"
              onClick={() => {
                setShowCreateForm((open) => !open);
                setCreateError(null);
                setCreateSuccess('');
              }}
            >
              Nueva operación
            </button>
          )}
          <Link className="button button-secondary" to="/contratos">Contratos de alquiler</Link>
        </div>
      </div>
      {catalogError && <ApiErrorMessage error={catalogError} />}
      {createError && <ApiErrorMessage error={createError} />}
      {createSuccess && <div className="notice notice-success" role="status">{createSuccess}</div>}
      {permissions && !permissions.puedeVer && (
        <div className="notice notice-info" role="status">No tenés permiso para ver operaciones.</div>
      )}
      {!permissions && !catalogError && (
        <div className="notice notice-info" role="status">No hay permisos de menú configurados para Operaciones.</div>
      )}
      {showCreateForm && permissions?.puedeCrear && (
        <section className="contact-card">
          <div className="contact-card-heading">
            <div>
              <h2>Registrar operación</h2>
              <p className="muted">Vinculá una propiedad, etapa y cliente opcional.</p>
            </div>
          </div>
          <form className="form-grid contact-form" onSubmit={submitOperation}>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Propiedad</span>
              <select
                name="idPropiedad"
                required
                value={operationForm.idPropiedad}
                onChange={updateOperationForm}
              >
                <option value="">Seleccionar propiedad</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.direccion} · {formatEnum(property.tipoPropiedad)}
                  </option>
                ))}
              </select>
              {properties.length === 0 && (
                <small className="field-hint">Primero registrá una propiedad.</small>
              )}
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Tipo de operación</span>
              <select
                name="tipoOperacion"
                value={operationForm.tipoOperacion}
                onChange={updateOperationForm}
              >
                <option value="VENTA">Venta</option>
                <option value="ALQUILER">Alquiler</option>
              </select>
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Etapa</span>
              <select
                name="idEtapa"
                required
                value={operationForm.idEtapa}
                onChange={updateOperationForm}
              >
                <option value="">Seleccionar etapa</option>
                {stages
                  .filter((stage) =>
                    stage.tipoOperacion === 'AMBAS' ||
                    stage.tipoOperacion === operationForm.tipoOperacion
                  )
                  .map((stage) => (
                    <option key={stage.id} value={stage.id}>{stage.descripcion}</option>
                  ))}
              </select>
            </label>
            {operationNeedsDropReason && (
              <label className="col-12 col-md-6 col-lg-4 field">
                <span>Motivo de baja</span>
                <select
                  name="idMotivoBaja"
                  required
                  value={operationForm.idMotivoBaja}
                  onChange={updateOperationForm}
                >
                  <option value="">Seleccionar motivo</option>
                  {dropReasons.map((reason) => (
                    <option key={reason.id} value={reason.id}>{reason.descripcion}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Cliente (opcional)</span>
              <select
                name="idCliente"
                value={operationForm.idCliente}
                onChange={updateOperationForm}
              >
                <option value="">Sin cliente</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>{contactName(contact)}</option>
                ))}
              </select>
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Precio en USD</span>
              <input
                name="precioUSD"
                type="number"
                min="0"
                step="any"
                value={operationForm.precioUSD}
                onChange={updateOperationForm}
              />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Precio en ARS</span>
              <input
                name="precioARS"
                type="number"
                min="0"
                step="any"
                value={operationForm.precioARS}
                onChange={updateOperationForm}
              />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Valor sugerido</span>
              <input
                name="valorSugerido"
                type="number"
                min="0"
                step="any"
                value={operationForm.valorSugerido}
                onChange={updateOperationForm}
              />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Firma de autorización</span>
              <input
                name="fechaFirmaAutorizacion"
                type="date"
                value={operationForm.fechaFirmaAutorizacion}
                onChange={updateOperationForm}
              />
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Vencimiento de autorización</span>
              <input
                name="fechaVencAutorizacion"
                type="date"
                min={operationForm.fechaFirmaAutorizacion || undefined}
                value={operationForm.fechaVencAutorizacion}
                onChange={updateOperationForm}
              />
            </label>
            <label className="col-12 role-option">
              <input
                name="esExclusiva"
                type="checkbox"
                checked={operationForm.esExclusiva}
                onChange={updateOperationForm}
              />
              <span>Autorización exclusiva</span>
            </label>
            <div className="col-12 contact-form-actions">
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setShowCreateForm(false)}
              >
                Cancelar
              </button>
              <button
                className="button button-primary"
                type="submit"
                disabled={
                  creatingOperation ||
                  properties.length === 0 ||
                  !operationForm.idEtapa ||
                  (operationNeedsDropReason && !operationForm.idMotivoBaja)
                }
              >
                {creatingOperation ? 'Guardando…' : 'Registrar operación'}
              </button>
            </div>
          </form>
        </section>
      )}
      {permissions?.puedeVer && (
        <>
          <ApiErrorMessage error={error} />
          <div className="form-grid contact-filters">
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Tipo de operación</span>
              <select name="tipoOperacion" value={filters.tipoOperacion} onChange={updateFilter}>
                <option value="">Todos</option>
                <option value="VENTA">Venta</option>
                <option value="ALQUILER">Alquiler</option>
              </select>
            </label>
            <label className="col-12 col-md-6 col-lg-4 field">
              <span>Etapa</span>
              <select name="idEtapa" value={filters.idEtapa} onChange={updateFilter}>
                <option value="">Todas</option>
                {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.descripcion}</option>)}
              </select>
            </label>
          </div>
          {operations.length === 0 && !error ? (
            <p className="empty-state">No hay operaciones para mostrar.</p>
          ) : !error ? (
            <div className="operation-list">
              {operations.map((operation) => (
                <article className="contact-card operation-card" key={operation.id}>
                  <div className="contact-card-heading">
                    <div>
                      <h2>{propertyName(operation.propiedad)}</h2>
                      <p className="muted">
                        {formatEnum(operation.tipoOperacion)} · Etapa: {operation.etapa?.descripcion || '—'}
                      </p>
                    </div>
                    <span className="status-badge status-en_seguimiento">
                      {operation.cliente ? contactName(operation.cliente) : 'Sin cliente'}
                    </span>
                  </div>
                  <dl className="contact-details">
                    <div><dt>Fecha de alta</dt><dd>{formatDate(operation.fechaAlta)}</dd></div>
                    <div><dt>Precio USD</dt><dd>{formatAmount(operation.precioUSD, 'USD')}</dd></div>
                    <div><dt>Precio ARS</dt><dd>{formatAmount(operation.precioARS, 'ARS')}</dd></div>
                    <div><dt>Motivo de baja</dt><dd>{operation.motivoBaja?.descripcion || '—'}</dd></div>
                  </dl>
                  <OperationActions
                    operation={operation}
                    stages={stages}
                    dropReasons={dropReasons}
                    contacts={contacts}
                    permissions={permissions}
                    contractPermissions={contractPermissions}
                    onChanged={loadOperations}
                  />
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
