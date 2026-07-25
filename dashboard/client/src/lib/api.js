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
  saveConfig: (settings) => request('/config', { method: 'POST', body: JSON.stringify({ settings }) }),
  getChannels: () => request('/channels'),
  editChannel: (channelId, data) => request(`/channels/${channelId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getRoles: () => request('/roles'),
  editRole: (roleId, data) => request(`/roles/${roleId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRole: (roleId) => request(`/roles/${roleId}`, { method: 'DELETE' }),
  getMessages: (channelId, limit = 50, before) =>
    request(`/messages/${channelId}?limit=${limit}${before ? `&before=${before}` : ''}`),
  sendMessage: (channelId, content, embed) =>
    request(`/messages/${channelId}`, { method: 'POST', body: JSON.stringify({ content, embed }) }),
  editMessage: (channelId, messageId, content, embed) =>
    request(`/messages/${channelId}/${messageId}`, { method: 'PATCH', body: JSON.stringify({ content, embed }) }),
  deleteMessage: (channelId, messageId) =>
    request(`/messages/${channelId}/${messageId}`, { method: 'DELETE' }),
  sendEmbed: (channelId, embed) =>
    request(`/messages/${channelId}/embed`, { method: 'POST', body: JSON.stringify({ embed }) }),
  closeTicket: (ticketId) => request(`/tickets/${ticketId}/close`, { method: 'POST' }),
  editTicket: (ticketId, data) => request(`/tickets/${ticketId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addParticipant: (ticketId, userId) => request(`/tickets/${ticketId}/participants`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeParticipant: (ticketId, userId) => request(`/tickets/${ticketId}/participants/${userId}`, { method: 'DELETE' }),
  editBlacklist: (id, data) => request(`/blacklists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  executeCommand: (command, args = []) => request('/commands/execute', { method: 'POST', body: JSON.stringify({ command, args }) }),
};
