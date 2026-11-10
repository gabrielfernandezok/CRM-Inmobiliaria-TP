import { apiRequest } from './client.js';

export function login(credentials) {
  return apiRequest('/auth/login', { method: 'POST', body: credentials });
}

export function register(userData) {
  return apiRequest('/auth/registro', { method: 'POST', body: userData });
}
