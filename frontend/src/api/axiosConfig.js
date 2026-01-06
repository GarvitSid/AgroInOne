const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      // Clear client storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Extract specific error details sent by backend (e.g. TOKEN_EXPIRED or INVALID_TOKEN)
      const reason = data?.error || 'Your session has expired. Please log in again.';
      const code = data?.code || 'UNAUTHORIZED';

      // Dispatch event with detail payload
      window.dispatchEvent(new CustomEvent('auth:unauthorized', {
        detail: { reason, code }
      }));
    }

    const error = new Error(data?.error || `Request failed with status ${response.status}`);
    error.response = { data, status: response.status };
    throw error;
  }

  return { data };
}

export const authService = {
  register: (name, email, phone, password) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, password }),
    }),
  
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () =>
    request('/auth/profile'),
};

export const schemesService = {
  getByState: (state) =>
    request(`/schemes?state=${encodeURIComponent(state)}`),
  
  getAll: () =>
    request('/schemes'),
};

export const helpdeskService = {
  getAll: () => request('/helpdesk'),
};

const apiClient = { request };

export default apiClient;
