import { apiRequest } from './client.js';

export function getMenu() {
  return apiRequest('/menu');
}
