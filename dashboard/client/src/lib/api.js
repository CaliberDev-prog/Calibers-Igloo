const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getOverview: () => request('/overview'),
  getTickets: (params = {}) => request(`/tickets?${new URLSearchParams(params)}`),
  getTicket: (id) => request(`/tickets/${id}`),
  getTicketStats: () => request('/tickets/stats/overview'),
  getBlacklists: (params = {}) => request(`/blacklists?${new URLSearchParams(params)}`),
  deleteBlacklist: (id) => request(`/blacklists/${id}`, { method: 'DELETE' }),
  getHealth: () => request('/health'),
  getConfig: () => request('/config'),
};
