import { apiRequest } from './client.js';

export function createOperation(operation) {
  return apiRequest('/operaciones', { method: 'POST', body: operation });
}

export function getOperations(filters = {}) {
  const query = new URLSearchParams();
  if (filters.tipoOperacion) query.set('tipoOperacion', filters.tipoOperacion);
  if (filters.idEtapa) query.set('idEtapa', filters.idEtapa);
  const queryString = query.toString();
  return apiRequest(`/operaciones${queryString ? `?${queryString}` : ''}`);
}

export function changeOperationStage(id, stage) {
  return apiRequest(`/operaciones/${encodeURIComponent(id)}/etapa`, {
    method: 'PATCH',
    body: stage,
  });
}

export function createOffer(id, offer) {
  return apiRequest(`/operaciones/${encodeURIComponent(id)}/ofertas`, {
    method: 'POST',
    body: offer,
  });
}

export function createRentalContract(id, contract) {
  return apiRequest(`/operaciones/${encodeURIComponent(id)}/contratos`, {
    method: 'POST',
    body: contract,
  });
}

export function getRentalContracts(filters = {}) {
  const query = new URLSearchParams();
  if (filters.estado) query.set('estado', filters.estado);
  if (filters.vencimientoDesde) query.set('vencimientoDesde', filters.vencimientoDesde);
  if (filters.vencimientoHasta) query.set('vencimientoHasta', filters.vencimientoHasta);
  const queryString = query.toString();
  return apiRequest(`/contratos${queryString ? `?${queryString}` : ''}`);
}

export function getOperationCatalogs() {
  return apiRequest('/catalogos');
}

export function getOperationContacts() {
  return apiRequest('/contactos?activo=true');
}
