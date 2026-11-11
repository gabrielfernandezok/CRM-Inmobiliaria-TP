import { apiRequest } from './client.js';

export function getContacts(filters = {}) {
  const query = new URLSearchParams();
  if (filters.tipoPersona) query.set('tipoPersona', filters.tipoPersona);
  if (filters.activo !== undefined && filters.activo !== '') {
    query.set('activo', filters.activo);
  }
  const queryString = query.toString();
  const suffix = queryString ? `?${queryString}` : '';
  return apiRequest(`/contactos${suffix}`);
}

export function getContact(id) {
  return apiRequest(`/contactos/${encodeURIComponent(id)}`);
}

export function createContact(contact) {
  return apiRequest('/contactos', { method: 'POST', body: contact });
}

export function updateContact(id, contact) {
  return apiRequest(`/contactos/${encodeURIComponent(id)}`, { method: 'PATCH', body: contact });
}

export function deactivateContact(id) {
  return apiRequest(`/contactos/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function getContactInteractions(id) {
  return apiRequest(`/contactos/${encodeURIComponent(id)}/interacciones`);
}

export function createContactInteraction(id, interaction) {
  return apiRequest(`/contactos/${encodeURIComponent(id)}/interacciones`, {
    method: 'POST',
    body: interaction,
  });
}

export function createContactSearch(id, search) {
  return apiRequest(`/contactos/${encodeURIComponent(id)}/busquedas`, {
    method: 'POST',
    body: search,
  });
}

export function getCatalogs() {
  return apiRequest('/catalogos');
}
