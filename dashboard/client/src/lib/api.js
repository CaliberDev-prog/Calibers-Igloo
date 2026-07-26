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
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  getOverview: () => request('/overview'),
  getTickets: (params = {}) => request(`/tickets?${new URLSearchParams(params)}`),
  getTicket: (id) => request(`/tickets/${id}`),
  getTranscript: (id) => request(`/tickets/${id}/transcript`),
  downloadTranscript: (id) => `${BASE}/tickets/${id}/transcript/download`,
  getTicketStats: (params = {}) => request(`/tickets/stats/overview?${new URLSearchParams(params)}`),
  getBlacklists: (params = {}) => request(`/blacklists?${new URLSearchParams(params)}`),
  createBlacklist: (data) => request('/blacklists', { method: 'POST', body: JSON.stringify(data) }),
  deleteBlacklist: (id) => request(`/blacklists/${id}`, { method: 'DELETE' }),
  getHealth: () => request('/health'),
  getConfig: () => request('/config'),
  saveConfig: (settings) => request('/config', { method: 'POST', body: JSON.stringify({ settings }) }),
  getChannels: () => request('/channels'),
  getMembers: (params = {}) => request(`/members?${new URLSearchParams(params)}`),
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
  closeTicket: (ticketId) => request(`/tickets/${ticketId}/close`, { method: 'POST' }),
  editTicket: (ticketId, data) => request(`/tickets/${ticketId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addParticipant: (ticketId, userId) => request(`/tickets/${ticketId}/participants`, { method: 'POST', body: JSON.stringify({ userId }) }),
  removeParticipant: (ticketId, userId) => request(`/tickets/${ticketId}/participants/${userId}`, { method: 'DELETE' }),
  editBlacklist: (id, data) => request(`/blacklists/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  reorderChannels: (positions) => request('/channels-reorder', { method: 'PATCH', body: JSON.stringify({ positions }) }),
  reorderRoles: (positions) => request('/roles-reorder', { method: 'PATCH', body: JSON.stringify({ positions }) }),
  getAuditLogs: (params = {}) => request(`/audit-logs?${new URLSearchParams(params)}`),
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  getGiveaways: (params = {}) => request(`/giveaways?${new URLSearchParams(params)}`),
  createGiveaway: (data) => request('/giveaways', { method: 'POST', body: JSON.stringify(data) }),
  endGiveaway: (id) => request(`/giveaways/${id}/end`, { method: 'POST' }),
  rerollGiveaway: (id) => request(`/giveaways/${id}/reroll`, { method: 'POST' }),
  deleteGiveaway: (id) => request(`/giveaways/${id}`, { method: 'DELETE' }),
};
