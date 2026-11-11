import { apiRequest } from './client.js';

export function getProperties(filters = {}) {
  const query = new URLSearchParams();
  if (filters.tipoPropiedad) query.set('tipoPropiedad', filters.tipoPropiedad);
  if (filters.estado) query.set('estado', filters.estado);
  if (filters.localidad) query.set('localidad', filters.localidad);
  const queryString = query.toString();
  return apiRequest(`/propiedades${queryString ? `?${queryString}` : ''}`);
}

export function getProperty(id) {
  return apiRequest(`/propiedades/${encodeURIComponent(id)}`);
}

export function getPropertyVisits(id) {
  return apiRequest(`/propiedades/${encodeURIComponent(id)}/visitas`);
}

export function createProperty(property) {
  return apiRequest('/propiedades', { method: 'POST', body: property });
}

export function updateProperty(id, property) {
  return apiRequest(`/propiedades/${encodeURIComponent(id)}`, { method: 'PATCH', body: property });
}

export function createVisit(visit) {
  return apiRequest('/visitas', { method: 'POST', body: visit });
}

export function getPropertyCatalogs() {
  return apiRequest('/catalogos');
}

export function getPropertyContacts() {
  return apiRequest('/contactos?tipoPersona=FISICA&activo=true');
}
