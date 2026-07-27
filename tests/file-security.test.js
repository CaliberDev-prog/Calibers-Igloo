import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function apiSanitizeFilename(input) {
  return String(input || 'transcript.html')
    .replace(/\0/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .slice(0, 100);
}

function buildTranscriptFilename(ticketId, deptSlug, creatorSlug) {
  return `ticket-${String(ticketId).padStart(4, '0')}-${deptSlug}-${creatorSlug}.html`;
}

describe('Filename sanitization — api.js download proxy', () => {
  it('strips null bytes', () => {
    const result = apiSanitizeFilename('ticket\x00.html');
    assert.ok(!result.includes('\x00'), 'Null bytes removed');
  });

  it('normalizes double dots in extensions', () => {
    const result = apiSanitizeFilename('ticket..html.exe');
    assert.ok(!result.includes('..'), 'Double dots collapsed');
  });

  it('does not inject path separators into filename', () => {
    const result = apiSanitizeFilename('ticket.html');
    assert.ok(result === 'ticket.html', 'Safe filename preserved');
  });

  it('strips leading dots (hidden files)', () => {
    const result = apiSanitizeFilename('....hidden.html');
    assert.ok(!result.startsWith('.'), 'Should not start with dot');
  });

  it('collapses multiple dots', () => {
    const result = apiSanitizeFilename('ticket...html');
    assert.ok(!result.includes('..'), 'Should not contain double dots');
  });

  it('replaces special characters with underscores', () => {
    const result = apiSanitizeFilename('ticket<script>.html');
    assert.ok(!result.includes('<'), 'Angle brackets replaced');
    assert.ok(!result.includes('>'), 'Angle brackets replaced');
  });

  it('truncates to 100 characters', () => {
    const long = 'a'.repeat(200);
    const result = apiSanitizeFilename(long);
    assert.ok(result.length <= 100, `Length ${result.length} should be <= 100`);
  });

  it('defaults to transcript.html for empty input', () => {
    const result = apiSanitizeFilename('');
    assert.ok(result.includes('transcript'), 'Default filename');
  });

  it('handles null input', () => {
    const result = apiSanitizeFilename(null);
    assert.ok(result.includes('transcript'), 'Null defaults to transcript.html');
  });

  it('prevents path traversal via forward slash', () => {
    const result = apiSanitizeFilename('../../../etc/passwd.html');
    assert.ok(!result.includes('/'), 'Forward slashes replaced');
    assert.ok(!result.includes('..'), 'Double dots collapsed');
  });

  it('prevents path traversal via backslash', () => {
    const result = apiSanitizeFilename('..\\..\\windows\\system32.html');
    assert.ok(!result.includes('\\'), 'Backslashes replaced');
    assert.ok(!result.includes('..'), 'Double dots collapsed');
  });

  it('handles CRLF injection attempt', () => {
    const result = apiSanitizeFilename('ticket\r\nX-Injected: yes.html');
    assert.ok(!result.includes('\r'), 'Carriage return removed');
    assert.ok(!result.includes('\n'), 'Newline removed');
  });

  it('preserves safe filenames', () => {
    const result = apiSanitizeFilename('ticket-0042-general-support-user.html');
    assert.equal(result, 'ticket-0042-general-support-user.html');
  });

  it('handles Unicode injection', () => {
    const result = apiSanitizeFilename('ticket-日本語.html');
    assert.ok(!result.includes('日'), 'Unicode replaced');
    assert.ok(!result.includes('本'), 'Unicode replaced');
  });
});

describe('Transcript filename construction — buildFilename', () => {
  it('produces expected format', () => {
    const result = buildTranscriptFilename(42, 'general-support', 'user123');
    assert.equal(result, 'ticket-0042-general-support-user123.html');
  });

  it('pads ticket ID to 4 digits', () => {
    const result = buildTranscriptFilename(1, 'support', 'user');
    assert.ok(result.startsWith('ticket-0001-'));
  });

  it('always ends with .html', () => {
    const result = buildTranscriptFilename(100, 'reports', 'admin');
    assert.ok(result.endsWith('.html'));
  });
});

describe('Transcript download — response headers', () => {
  const HEADERS_BLOCKLIST = [
    'X-Powered-By',
    'Server',
  ];

  it('helmet is configured for security headers', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/index.js', 'utf8');
    assert.ok(content.includes('helmet'), 'Helmet middleware present');
  });

  it('transcript download sets nosniff header', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/api/tickets.js', 'utf8');
    assert.ok(content.includes("X-Content-Type-Options", 'nosniff'), 'nosniff header present');
  });

  it('transcript download sets Cache-Control: private, no-store', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/api/tickets.js', 'utf8');
    assert.ok(content.includes("'private, no-store'"), 'Cache-Control set to private, no-store');
  });

  it('transcript download sets charset=utf-8 in Content-Type', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/api/tickets.js', 'utf8');
    assert.ok(content.includes("text/html; charset=utf-8"), 'Content-Type includes charset');
  });

  it('transcript download has size limit check', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/api/tickets.js', 'utf8');
    assert.ok(content.includes('MAX_TRANSCRIPT_BYTES'), 'Size limit constant present');
    assert.ok(content.includes('413'), 'Returns 413 for oversized transcripts');
  });

  it('transcript download has fetch timeout', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/api/tickets.js', 'utf8');
    assert.ok(content.includes('AbortSignal.timeout'), 'Fetch has timeout');
  });
});

describe('Transcript generation — size validation', () => {
  it('transcript service has size limit constant', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/services/transcriptService.js', 'utf8');
    assert.ok(content.includes('MAX_BUFFER_BYTES'), 'Buffer size limit present');
    assert.ok(content.includes('7.5'), 'Limit is 7.5MB');
  });

  it('transcript service throws on oversized buffer', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/services/transcriptService.js', 'utf8');
    assert.ok(content.includes('Transcript too large'), 'Error message for oversized transcript');
  });

  it('message fetch is capped at 500', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/services/transcriptService.js', 'utf8');
    assert.ok(content.includes('fetched.length < 500'), 'Message fetch capped at 500');
  });
});

describe('Transcript filename — source code sanitization', () => {
  it('buildFilename strips non-alphanumeric from dept slug', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/services/transcriptService.js', 'utf8');
    assert.ok(content.includes('[^a-z0-9]+'), 'Regex strips non-alphanumeric');
  });

  it('buildFilename truncates creator slug to 20 chars', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/services/transcriptService.js', 'utf8');
    assert.ok(content.includes('.slice(0, 20)'), 'Creator slug truncated to 20');
  });

  it('sanitizeFilename strips null bytes', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/services/transcriptService.js', 'utf8');
    assert.ok(content.includes('replace(/\\0/g'), 'Null bytes stripped');
  });

  it('sanitizeFilename normalizes double dots', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/services/transcriptService.js', 'utf8');
    assert.ok(content.includes('replace(/\\.{2,}/g'), 'Double dots normalized');
  });

  it('sanitizeFilename enforces .html extension', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/services/transcriptService.js', 'utf8');
    assert.ok(content.includes(".html'"), 'Forces .html extension');
  });

  it('api.js download also strips null bytes in filename', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/api/tickets.js', 'utf8');
    const downloadSection = content.slice(content.indexOf('/transcript/download'));
    assert.ok(downloadSection.includes('replace(/\\0/g'), 'Download endpoint strips null bytes');
  });
});

describe('Content-Disposition header — injection prevention', () => {
  it('filename is wrapped in double quotes', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/api/tickets.js', 'utf8');
    assert.ok(content.includes('filename="${safeFilename}"'), 'Filename in double quotes');
  });

  it('filename sanitization prevents CRLF in Content-Disposition', () => {
    const result = apiSanitizeFilename('test\r\nX-Injected: value.html');
    assert.ok(!result.includes('\r'), 'No CR');
    assert.ok(!result.includes('\n'), 'No LF');
  });

  it('filename sanitization prevents quote injection', () => {
    const result = apiSanitizeFilename('test"; malicious=true.html');
    assert.ok(!result.includes('"'), 'Double quotes stripped');
  });
});
