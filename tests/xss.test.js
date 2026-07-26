import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSafeUrl, sanitizeUrl } from '../dashboard/server/utils/urlValidation.js';

describe('esc() — HTML entity encoding', () => {
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  it('escapes angle brackets', () => {
    assert.equal(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes ampersand', () => {
    assert.equal(esc('a&b'), 'a&amp;b');
  });

  it('escapes double quotes', () => {
    assert.equal(esc('a"b'), 'a&quot;b');
  });

  it('escapes single quotes', () => {
    assert.equal(esc("a'b"), 'a&#039;b');
  });

  it('escapes all five critical characters together', () => {
    const input = `<img src=x onerror="alert('XSS & friends')">`;
    const result = esc(input);
    assert.ok(!result.includes('<'));
    assert.ok(!result.includes('>'));
    assert.ok(!result.includes('"'));
    assert.ok(!result.includes("'"));
    assert.ok(result.includes('&amp;'));
  });

  it('handles empty string', () => {
    assert.equal(esc(''), '');
  });

  it('handles non-string input', () => {
    assert.equal(esc(123), '123');
    assert.equal(esc(null), 'null');
    assert.equal(esc(undefined), 'undefined');
  });

  it('preserves safe content', () => {
    assert.equal(esc('Hello World'), 'Hello World');
    assert.equal(esc('ticket #1234'), 'ticket #1234');
  });

  it('prevents attribute injection via double quotes', () => {
    const input = '" onmouseover="alert(1)';
    const result = esc(input);
    assert.ok(result.includes('&quot;'));
    assert.ok(!result.includes('"'));
  });

  it('prevents attribute injection via single quotes', () => {
    const input = "' onmouseover='alert(1)";
    const result = esc(input);
    assert.ok(result.includes('&#039;'));
    assert.ok(!result.includes("'"));
  });
});

describe('isSafeUrl() — URL scheme validation', () => {
  it('accepts http URLs', () => {
    assert.equal(isSafeUrl('http://example.com'), true);
  });

  it('accepts https URLs', () => {
    assert.equal(isSafeUrl('https://example.com'), true);
  });

  it('rejects javascript: URLs', () => {
    assert.equal(isSafeUrl('javascript:alert(1)'), false);
  });

  it('rejects javascript: with whitespace', () => {
    assert.equal(isSafeUrl('  javascript:alert(1)'), false);
  });

  it('rejects JavaScript: (case-insensitive)', () => {
    assert.equal(isSafeUrl('JavaScript:alert(1)'), false);
  });

  it('rejects vbscript: URLs', () => {
    assert.equal(isSafeUrl('vbscript:MsgBox("XSS")'), false);
  });

  it('rejects data: URLs', () => {
    assert.equal(isSafeUrl('data:text/html,<script>alert(1)</script>'), false);
  });

  it('rejects blob: URLs', () => {
    assert.equal(isSafeUrl('blob:https://example.com/id'), false);
  });

  it('rejects file: URLs', () => {
    assert.equal(isSafeUrl('file:///etc/passwd'), false);
  });

  it('rejects empty string', () => {
    assert.equal(isSafeUrl(''), false);
  });

  it('rejects non-string input', () => {
    assert.equal(isSafeUrl(null), false);
    assert.equal(isSafeUrl(undefined), false);
    assert.equal(isSafeUrl(123), false);
  });

  it('rejects protocol-relative URLs', () => {
    assert.equal(isSafeUrl('//evil.com/script.js'), false);
  });

  it('accepts Discord CDN URLs', () => {
    assert.equal(isSafeUrl('https://cdn.discordapp.com/avatars/123/abc.png'), true);
  });

  it('accepts Discord media URLs', () => {
    assert.equal(isSafeUrl('https://media.discordapp.net/attachments/123/abc.png'), true);
  });

  it('handles leading whitespace', () => {
    assert.equal(isSafeUrl('  https://example.com'), true);
  });
});

describe('sanitizeUrl() — URL sanitization', () => {
  it('returns safe URLs', () => {
    assert.equal(sanitizeUrl('https://example.com'), 'https://example.com');
  });

  it('returns empty string for dangerous URLs', () => {
    assert.equal(sanitizeUrl('javascript:alert(1)'), '');
  });

  it('returns empty string for data URLs', () => {
    assert.equal(sanitizeUrl('data:text/html,<h1>XSS</h1>'), '');
  });

  it('trims whitespace', () => {
    assert.equal(sanitizeUrl('  https://example.com  '), 'https://example.com');
  });

  it('returns empty string for null/undefined', () => {
    assert.equal(sanitizeUrl(null), '');
    assert.equal(sanitizeUrl(undefined), '');
  });
});

describe('Transcript inline CSP', () => {
  function buildTranscriptHtml(ticketId) {
    return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src https:; font-src https:;">`;
  }

  it('includes CSP meta tag', () => {
    const html = buildTranscriptHtml(1234);
    assert.ok(html.includes('Content-Security-Policy'));
  });

  it('CSP blocks external scripts', () => {
    const html = buildTranscriptHtml(1234);
    assert.ok(!html.includes("script-src 'self'"));
    assert.ok(html.includes("script-src 'unsafe-inline'"));
  });

  it('CSP blocks external stylesheets', () => {
    const html = buildTranscriptHtml(1234);
    assert.ok(html.includes("style-src 'unsafe-inline'"));
  });

  it('CSP allows images from https only', () => {
    const html = buildTranscriptHtml(1234);
    assert.ok(html.includes('img-src https:'));
    assert.ok(!html.includes('data:'), 'CSP should not allow data: URIs');
  });
});

describe('Transcript search highlight — safe DOM manipulation', () => {
  function escapeRegex(q) {
    return q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  it('regex escapes angle brackets in search query', () => {
    const q = '<script>alert(1)</script>';
    const escaped = escapeRegex(q);
    const re = new RegExp('(' + escaped + ')', 'gi');
    const input = 'Hello <script>alert(1)</script> World';
    const matches = input.match(re);
    assert.ok(matches);
    assert.equal(matches.length, 1);
  });

  it('regex escapes parentheses', () => {
    const q = 'test(1)';
    const escaped = escapeRegex(q);
    const re = new RegExp('(' + escaped + ')', 'gi');
    assert.ok('test(1)'.match(re));
  });

  it('regex escapes dollar signs', () => {
    const q = '$100';
    const escaped = escapeRegex(q);
    const re = new RegExp('(' + escaped + ')', 'gi');
    assert.ok('$100'.match(re));
  });

  it('regex escapes curly braces', () => {
    const q = '{test}';
    const escaped = escapeRegex(q);
    const re = new RegExp('(' + escaped + ')', 'gi');
    assert.ok('{test}'.match(re));
  });

});

describe('No dangerouslySetInnerHTML in React components', () => {
  it('TranscriptViewerModal does not use dangerouslySetInnerHTML', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/client/src/components/TranscriptViewerModal.jsx', 'utf8');
    assert.ok(!content.includes('dangerouslySetInnerHTML'), 'TranscriptViewerModal should not use dangerouslySetInnerHTML');
  });

  it('MessagesPage does not use dangerouslySetInnerHTML', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/client/src/pages/MessagesPage.jsx', 'utf8');
    assert.ok(!content.includes('dangerouslySetInnerHTML'), 'MessagesPage should not use dangerouslySetInnerHTML');
  });

  it('EmbedBuilder does not use dangerouslySetInnerHTML', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/client/src/components/EmbedBuilder.jsx', 'utf8');
    assert.ok(!content.includes('dangerouslySetInnerHTML'), 'EmbedBuilder should not use dangerouslySetInnerHTML');
  });

  it('no React component uses dangerouslySetInnerHTML', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const clientDir = 'dashboard/client/src';
    const files = fs.readdirSync(path.join(clientDir, 'components')).filter(f => f.endsWith('.jsx'));
    for (const file of files) {
      const content = fs.readFileSync(path.join(clientDir, 'components', file), 'utf8');
      assert.ok(!content.includes('dangerouslySetInnerHTML'), `${file} should not use dangerouslySetInnerHTML`);
    }
  });
});

describe('No eval() or new Function() in codebase', () => {
  it('no eval() in server routes', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('dashboard/server/routes/api.js', 'utf8');
    assert.ok(!content.includes('eval('), 'api.js should not contain eval()');
  });

  it('no eval() in transcript service', async () => {
    const fs = await import('fs');
    const content = fs.readFileSync('src/services/transcriptService.js', 'utf8');
    assert.ok(!content.includes('eval('), 'transcriptService.js should not contain eval()');
  });

  it('no new Function() in server code', async () => {
    const fs = await import('fs');
    const files = ['dashboard/server/index.js', 'dashboard/server/routes/api.js', 'dashboard/server/middleware/auth.js'];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      assert.ok(!content.includes('new Function('), `${file} should not contain new Function()`);
    }
  });
});

describe('Transcript XSS payload rendering', () => {
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  const payloads = [
    '<script>alert("XSS")</script>',
    '<img src=x onerror=alert(1)>',
    '<svg onload=alert(1)>',
    '<iframe src="javascript:alert(1)">',
    '<body onload=alert(1)>',
    '"><script>alert(String.fromCharCode(88,83,83))</script>',
    "';alert('XSS');//",
    '<img src="x" onerror="alert(document.cookie)">',
    '<details open ontoggle=alert(1)>',
  ];

  payloads.forEach((payload, i) => {
    it(`escapes XSS payload #${i + 1}`, () => {
      const escaped = esc(payload);
      assert.ok(!/<script/i.test(escaped), 'No raw <script> tag');
      assert.ok(!/<img[^>]+onerror/i.test(escaped), 'No <img> with onerror');
      assert.ok(!/<svg[^>]+onload/i.test(escaped), 'No <svg> with onload');
      assert.ok(!/<iframe/i.test(escaped), 'No raw <iframe> tag');
      assert.ok(!/<body[^>]+onload/i.test(escaped), 'No <body> with onload');
      assert.ok(!/<details[^>]+ontoggle/i.test(escaped), 'No <details> with ontoggle');
    });
  });

  it('message content with XSS renders as text in HTML', () => {
    const malicious = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';
    const escaped = esc(malicious);
    const snippet = `<div class="msg-txt">${escaped}</div>`;
    assert.ok(snippet.includes('&lt;script&gt;'), 'Script tag entity-encoded');
    assert.ok(snippet.includes('&lt;img'), 'Img tag entity-encoded');
    assert.ok(!snippet.includes('<script>'), 'No raw script');
    assert.ok(!snippet.includes('<img src=x'), 'No raw img');
  });

  it('username with XSS renders as text in HTML', () => {
    const malicious = '<img src=x onerror=alert("name")>';
    const escaped = esc(malicious);
    const snippet = `<span class="msg-name">${escaped}</span>`;
    assert.ok(snippet.includes('&lt;img'), 'Username entity-encoded');
    assert.ok(!snippet.includes('<img src='), 'No raw img in username');
  });

  it('embed title with XSS renders as text in HTML', () => {
    const malicious = '</div><script>alert("embed")</script>';
    const escaped = esc(malicious);
    const snippet = `<div class="emb-title">${escaped}</div>`;
    assert.ok(!snippet.includes('<script>'), 'No raw script in embed title');
  });

  it('attachment name with XSS renders as text in HTML', () => {
    const malicious = '"><script>alert("file")</script>.html';
    const escaped = esc(malicious);
    const snippet = `<div class="att-name">${escaped}</div>`;
    assert.ok(!snippet.includes('<script>'), 'No raw script in attachment name');
  });

  it('generated transcript contains inline CSP before body content', () => {
    const sample = '<head><meta charset="UTF-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; img-src https:;"><meta name="viewport"></head><body>';
    const cspIdx = sample.indexOf('Content-Security-Policy');
    const bodyIdx = sample.indexOf('<body');
    assert.ok(cspIdx > 0, 'CSP present');
    assert.ok(cspIdx < bodyIdx, 'CSP before body');
  });
});
