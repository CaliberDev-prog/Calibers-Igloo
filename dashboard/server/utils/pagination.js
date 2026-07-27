export function sanitizeSearch(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100);
}

export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 25));
  return { page, limit, skip: (page - 1) * limit };
}
