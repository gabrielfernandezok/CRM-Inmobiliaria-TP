import { useState } from 'react';
import ApiErrorMessage from './ApiErrorMessage.jsx';
import { formatContactOption, formatEnum } from '../utils/format.js';

export const PROPERTY_TYPES = ['CASA', 'DEPARTAMENTO', 'TERRENO', 'LOCAL', 'OFICINA'];
export const PROPERTY_STATES = ['DISPONIBLE', 'RESERVADA', 'VENDIDA', 'ALQUILADA', 'RETIRADA'];

export function emptyPropertyForm() {
  return {
    tipoPropiedad: 'CASA',
    direccion: '',
    localidad: '',
    esPH: false,
    ambientes: '',
    dormitorios: '',
    antiguedadAnios: '',
    superficie: '',
    aptoCredito: 'NO_ESPECIFICADO',
    latitud: '',
    longitud: '',
    descripcion: '',
    llaveEntregada: false,
    estado: 'DISPONIBLE',
    fechaAlta: '',
    propietarios: [{ idContacto: '', porcentaje: '100' }],
    caracteristicas: [],
  };
}

export function propertyToForm(property) {
  return {
    tipoPropiedad: property.tipoPropiedad,
    direccion: property.direccion || '',
    localidad: property.localidad || '',
    esPH: Boolean(property.esPH),
    ambientes: property.ambientes ?? '',
    dormitorios: property.dormitorios ?? '',
    antiguedadAnios: property.antiguedadAnios ?? '',
    superficie: property.superficie ?? '',
    aptoCredito: property.aptoCredito || 'NO_ESPECIFICADO',
    latitud: property.latitud ?? '',
    longitud: property.longitud ?? '',
    descripcion: property.descripcion || '',
    llaveEntregada: Boolean(property.llaveEntregada),
    estado: property.estado,
    fechaAlta: property.fechaAlta?.slice(0, 10) || '',
    propietarios: (property.propietarios || []).map((owner) => ({
      idContacto: String(owner.idContacto ?? owner.contacto?.id ?? ''),
      porcentaje: String(owner.porcentaje ?? ''),
    })),
    caracteristicas: (property.caracteristicas || []).map((item) => item.id),
  };
}

function nullableNumber(value, integer = false) {
  if (value === '' || value === null || value === undefined) return null;
  return integer ? Number.parseInt(value, 10) : value;
}

export function propertyPayload(form) {
  return {
    tipoPropiedad: form.tipoPropiedad,
    direccion: form.direccion,
    estado: form.estado,
    localidad: form.localidad || null,
    esPH: form.esPH,
    ambientes: nullableNumber(form.ambientes, true),
    dormitorios: nullableNumber(form.dormitorios, true),
    antiguedadAnios: nullableNumber(form.antiguedadAnios, true),
    superficie: nullableNumber(form.superficie),
    aptoCredito: form.aptoCredito,
    latitud: nullableNumber(form.latitud),
    longitud: nullableNumber(form.longitud),
    descripcion: form.descripcion || null,
    llaveEntregada: form.llaveEntregada,
    ...(form.fechaAlta ? { fechaAlta: form.fechaAlta } : {}),
    propietarios: form.propietarios
      .filter((owner) => owner.idContacto !== '')
      .map((owner) => ({ idContacto: Number(owner.idContacto), porcentaje: owner.porcentaje })),
    caracteristicas: form.caracteristicas,
  };
}

export default function PropertyForm({
  initialValue,
  contacts,
  characteristics,
  onSubmit,
  submitting,
  submitLabel,
  error,
}) {
  const [form, setForm] = useState(() => initialValue || emptyPropertyForm());

  function updateField(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  function updateOwner(index, field, value) {
    setForm((current) => ({
      ...current,
      propietarios: current.propietarios.map((owner, ownerIndex) =>
        ownerIndex === index ? { ...owner, [field]: value } : owner
      ),
    }));
  }

  function toggleCharacteristic(event) {
    const id = Number(event.target.value);
    setForm((current) => ({
      ...current,
      caracteristicas: event.target.checked
        ? [...current.caracteristicas, id]
        : current.caracteristicas.filter((item) => item !== id),
    }));
  }

  function addOwner() {
    setForm((current) => ({
      ...current,
      propietarios: [...current.propietarios, { idContacto: '', porcentaje: '' }],
    }));
  }

  function removeOwner(index) {
    setForm((current) => ({
      ...current,
      propietarios: current.propietarios.filter((_, ownerIndex) => ownerIndex !== index),
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(propertyPayload(form));
  }

  return (
    <form className="form-grid contact-form" onSubmit={handleSubmit}>
      <ApiErrorMessage error={error} />
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Tipo de propiedad</span>
        <select name="tipoPropiedad" required value={form.tipoPropiedad} onChange={updateField}>
          {PROPERTY_TYPES.map((type) => <option key={type} value={type}>{formatEnum(type)}</option>)}
        </select>
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Dirección</span>
        <input name="direccion" required value={form.direccion} onChange={updateField} />
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Localidad</span>
        <input name="localidad" value={form.localidad} onChange={updateField} />
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Estado</span>
        <select name="estado" required value={form.estado} onChange={updateField}>
          {PROPERTY_STATES.map((state) => <option key={state} value={state}>{formatEnum(state)}</option>)}
        </select>
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Ambientes</span>
        <input name="ambientes" type="number" min="1" step="1" value={form.ambientes} onChange={updateField} />
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Dormitorios</span>
        <input name="dormitorios" type="number" min="0" step="1" value={form.dormitorios} onChange={updateField} />
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Antigüedad (años)</span>
        <input name="antiguedadAnios" type="number" min="0" step="1" value={form.antiguedadAnios} onChange={updateField} />
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Superficie (m²)</span>
        <input name="superficie" type="number" min="0" step="any" value={form.superficie} onChange={updateField} />
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Apto crédito</span>
        <select name="aptoCredito" value={form.aptoCredito} onChange={updateField}>
          <option value="NO_ESPECIFICADO">No especificado</option>
          <option value="APTO_CREDITO">Apto crédito</option>
          <option value="NO_APTO_CREDITO">No apto crédito</option>
        </select>
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Latitud</span>
        <input name="latitud" type="number" min="-90" max="90" step="any" value={form.latitud} onChange={updateField} />
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Longitud</span>
        <input name="longitud" type="number" min="-180" max="180" step="any" value={form.longitud} onChange={updateField} />
      </label>
      <label className="col-12 col-md-6 col-lg-4 field">
        <span>Fecha de alta</span>
        <input name="fechaAlta" type="date" value={form.fechaAlta} onChange={updateField} />
      </label>
      <label className="col-12 field">
        <span>Descripción</span>
        <textarea name="descripcion" rows="3" value={form.descripcion} onChange={updateField} />
      </label>
      <label className="col-12 col-md-6 role-option">
        <input name="esPH" type="checkbox" checked={form.esPH} onChange={updateField} />
        <span>Es propiedad horizontal</span>
      </label>
      <label className="col-12 col-md-6 role-option">
        <input name="llaveEntregada" type="checkbox" checked={form.llaveEntregada} onChange={updateField} />
        <span>Llave entregada</span>
      </label>

      <fieldset className="col-12 role-picker">
        <legend>Propietarios</legend>
        {contacts.length === 0 && (
          <p className="field-hint">No hay contactos activos disponibles para asociar.</p>
        )}
        {form.propietarios.map((owner, index) => (
          <div className="owner-form-row" key={`owner-${index}`}>
            <label className="field">
              <span>Contacto</span>
              <select
                required
                value={owner.idContacto}
                onChange={(event) => updateOwner(index, 'idContacto', event.target.value)}
              >
                <option value="">Seleccionar contacto</option>
                {contacts
                  .filter((contact) =>
                    !form.propietarios.some((selected, selectedIndex) =>
                      selectedIndex !== index && Number(selected.idContacto) === contact.id
                    )
                  )
                  .map((contact) => (
                  <option key={contact.id} value={contact.id}>{formatContactOption(contact)}</option>
                  ))}
              </select>
            </label>
            <label className="field">
              <span>Porcentaje</span>
              <input
                type="number"
                min="0"
                max="100"
                step="any"
                required
                value={owner.porcentaje}
                onChange={(event) => updateOwner(index, 'porcentaje', event.target.value)}
              />
            </label>
            {form.propietarios.length > 1 && (
              <button className="button button-secondary owner-remove" type="button" onClick={() => removeOwner(index)}>
                Quitar
              </button>
            )}
          </div>
        ))}
        <button className="button button-secondary" type="button" onClick={addOwner}>Agregar propietario</button>
      </fieldset>

      <fieldset className="col-12 role-picker">
        <legend>Características</legend>
        {characteristics.length ? (
          <div className="role-options">
            {characteristics.map((item) => (
              <label className="role-option" key={item.id}>
                <input
                  type="checkbox"
                  value={item.id}
                  checked={form.caracteristicas.includes(item.id)}
                  onChange={toggleCharacteristic}
                />
                <span>{item.descripcion}</span>
              </label>
            ))}
          </div>
        ) : <p className="field-hint">No hay características disponibles en el catálogo.</p>}
      </fieldset>
      <div className="col-12 contact-form-actions">
        <button className="button button-primary" type="submit" disabled={submitting || contacts.length === 0}>
          {submitting ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
