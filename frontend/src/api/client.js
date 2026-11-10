const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
let unauthorizedHandler = () => {};

export class ApiError extends Error {
  constructor(message, status, details = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = handler;
}

export async function apiRequest(path, { method = 'GET', body, headers = {} } = {}) {
  if (!API_URL) {
    throw new ApiError('Falta configurar VITE_API_URL en el archivo .env del frontend.', 0);
  }

  const token = localStorage.getItem('crm_token');
  const requestHeaders = { Accept: 'application/json', ...headers };
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  if (token) requestHeaders.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No se pudo conectar con la API. Verificá el servidor y la configuración de CORS.', 0);
  }

  let payload = null;
  const responseText = await response.text();
  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = { message: responseText };
    }
  }

  if (response.status === 401) unauthorizedHandler();
  if (!response.ok) {
    const details = Array.isArray(payload?.errors) ? payload.errors : [];
    throw new ApiError(payload?.message || `Error HTTP ${response.status}`, response.status, details);
  }

  return payload;
}
