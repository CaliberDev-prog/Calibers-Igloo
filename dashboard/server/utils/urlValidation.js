const SAFE_URL_RE = /^https?:\/\//i;
const BLOCKED_SCHEMES = /^\s*(javascript|vbscript|data|blob|file):/i;

export function isSafeUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (BLOCKED_SCHEMES.test(trimmed)) return false;
  return SAFE_URL_RE.test(trimmed);
}

export function sanitizeUrl(value) {
  if (!isSafeUrl(value)) return '';
  return value.trim();
}
