import { apiRequest } from './client.js';

export function getConsultations() {
  return apiRequest('/consultas');
}

export function createConsultation(consultation) {
  return apiRequest('/consultas', { method: 'POST', body: consultation });
}

export function getConsultationCatalogs() {
  return apiRequest('/catalogos');
}

export function getConsultationContacts() {
  return apiRequest('/contactos?tipoPersona=FISICA&activo=true');
}

export function getConsultationProperties() {
  return apiRequest('/propiedades');
}
