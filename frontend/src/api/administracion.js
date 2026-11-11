import { apiRequest } from './client.js';

export function getAdminUsers() {
  return apiRequest('/usuarios');
}

export function getAdminProfiles() {
  return apiRequest('/perfiles');
}

export function updateUserProfiles(id, perfiles) {
  return apiRequest(`/usuarios/${encodeURIComponent(id)}/perfiles`, {
    method: 'PUT',
    body: { perfiles },
  });
}

export function getProfilePrograms(id) {
  return apiRequest(`/perfiles/${encodeURIComponent(id)}/programas`);
}

export function updateProfilePrograms(id, programas) {
  return apiRequest(`/perfiles/${encodeURIComponent(id)}/programas`, {
    method: 'PUT',
    body: { programas },
  });
}
