# Batch 1 — Security Criticals: Tracking

> **Milestone:** Batch 1 - Security Criticals (GitHub #1)
> **Last Updated:** 2026-07-26
> **Status:** Active — Issues #1-#15 in implementation order

---

## Issue Order (Implementation Sequence)

| # | GitHub | Issue | Status | Dependencies | Findings |
|---|--------|-------|--------|-------------|----------|
| 1 | #6 | Audit JWT authentication flow | **DONE** | None | Commit 36bfd2b |
| 2 | #15 | Session security best practices | **DONE** | #6 | Commit 7387b96 |
| 3 | #14 | Auth to all protected routes | **DONE (no-code)** | #6 | Verified — tests prove it |
| 4 | #12 | Bot command permission validation | **DONE** | #6 | Fixed 5 issues, 52 tests |
| 5 | #1 | API input validation gaps | **DONE** | None | 22 endpoints validated, 28 tests |
| 6 | #8 | NoSQL injection prevention | **DONE** | #1 | mongo-sanitize middleware, 26 tests |
| 7 | #7 | XSS sanitization | **DONE** | None | TreeWalker search fix, CSP meta, URL validation, 59 tests |
| 8 | #9 | File upload / transcript security | **DONE** | #7 | 5MB size limit, nosniff, filename hardening, 35 tests |
| 9 | #3 | Harden CORS | Pending | None | Already done — may close |
| 10 | #4 | Harden security headers | Pending | None | Already done via helmet |
| 11 | #5 | CSRF protection | Pending | #3 | Not implemented |
| 12 | #2 | Rate limiting | Pending | None | Partially done |
| 13 | #10 | Secure error responses | Pending | None | Partially done |
| 14 | #11 | Security audit logging | Pending | None | Partially done |
| 15 | #13 | Harden MongoDB connection | Pending | None | No TLS, no pool limits |

---

## Current State Analysis

### What's Already Done
- JWT algorithm pinned to HS256 (auth.js:19)
- JWT_SECRET validated at startup (auth.js:4-7, server/index.js:28-31)
- OWNER_ID validated at startup (server/index.js:32-35)
- CORS dynamic origin callback (server/index.js:69-78)
- Helmet security headers (CSP, HSTS, X-Frame-Options, noSniff) (server/index.js:55-63)
- Rate limiting on login (15/15min) and API (500/15min) (server/index.js:82-86)
- Auth middleware on all API routes (api.js:28)
- Input validation on many endpoints (snowflake regex, length limits, type checks)
- `sanitizeSearch` function for regex injection (api.js:17-20)
- Transcript download CSP header (api.js:382)
- Audit logging on tickets, blacklists, giveaways, users

### What Needs Work
- ~~JWT expiry too long (7d → 24h)~~ **DONE in #6**
- ~~No refresh token pattern~~ **DONE in #6**
- ~~No token revocation/blacklist~~ **DONE in #15**
- No CSRF tokens (SameSite=lax only)
- ~~No mongo-sanitize middleware~~ **DONE in #8**
- ~~No DOMPurify for transcript rendering~~ **DONE in #7 — TreeWalker approach, no DOMPurify needed**
- Some endpoints missing channelId/ObjectId validation
- Audit logging missing on channels, roles, messages, config
- MongoDB connection missing TLS, pool limits, socket timeout
- ~~Bot commands need per-command permission audit~~ **DONE in #12**

---

## Overlap Analysis

### #6 (JWT) vs #15 (Session Security)
**Resolution:** Complementary, not overlapping.
- #6: JWT token verification, algorithm pinning, secret validation, token format
- #15: Token lifecycle — access token expiry (7d → 24h), refresh tokens, rotation, revocation, cookie hardening

### #1 (Input Validation) vs #8 (NoSQL) vs #7 (XSS)
**Resolution:** Three distinct layers, no overlap.
- #1: Type checking, format validation, length limits, range bounds (request ingress)
- #8: Block MongoDB operators in user input, use mongo-sanitize, validate query construction
- #7: Sanitize output for browser rendering, DOMPurify, safe React patterns (output egress)

### #3 (CORS) vs #4 (Security Headers)
**Resolution:** Both mostly done.
- #3: CORS is already implemented correctly — may close as "already resolved"
- #4: Helmet already sets all recommended headers — may close as "already resolved"
- Both need verification and documentation, not code changes

---

## Issues Likely Resolved (Verify Then Close)

| Issue | Current State | Action |
|-------|--------------|--------|
| #3 CORS | Dynamic origin, credentials, dev-only localhost | Verify, close |
| #4 Security Headers | Helmet with CSP, HSTS, X-Frame-Options, noSniff | Verify, close |
| #14 Auth on Routes | `router.use(authenticate)` at line 28 | Verify, close |

---

## Issues Requiring Full Implementation

| Issue | Scope | Estimated Effort |
|-------|-------|-----------------|
| #6 JWT Audit | Token format OK, need expiry reduction, token introspection | 2-3 hours |
| #15 Session Security | Add refresh token pattern, revocation, cookie hardening | 4-6 hours |
| #12 Bot Permissions | Audit each command in src/commands/ | 2-3 hours |
| #1 Input Validation | Add missing channelId/ObjectId validation on ~8 endpoints | 3-4 hours |
| #8 NoSQL Injection | Add mongo-sanitize, validate query objects | 2-3 hours |
| #7 XSS Sanitization | Add DOMPurify for transcripts, audit dangerouslySetInnerHTML | 2-3 hours |
| #9 Transcript Security | Review file handling, temp cleanup | 1-2 hours |
| #5 CSRF Protection | Add CSRF token mechanism (after auth changes) | 4-6 hours |
| #2 Rate Limiting | Add mutation-specific limits | 1-2 hours |
| #10 Error Responses | Audit catch blocks, sanitize stack traces | 2-3 hours |
| #11 Audit Logging | Add logging to channels, roles, messages, config | 2-3 hours |
| #13 MongoDB Connection | Add TLS, pool limits, socket timeout | 1-2 hours |

---

## Security Findings Discovered During Analysis

| Finding | Severity | Issue | Status |
|---------|----------|-------|--------|
| JWT expiry is 7 days (should be 24h) | High | #15 | **FIXED in #6** |
| No refresh token mechanism | High | #15 | **FIXED in #6** |
| No token revocation (logout just clears cookie) | High | #15 | **FIXED in #15** |
| No CSRF tokens on state-changing endpoints | Medium | #5 | Pending |
| No mongo-sanitize on request bodies | Medium | #8 | **FIXED in #8** |
| Transcript uses dangerouslySetInnerHTML without DOMPurify | Medium | #7 | Pending |
| Some endpoints skip channelId validation | Medium | #1 | Pending |
| MongoDB connection has no TLS | Low | #13 | Pending |
| Missing audit logging on ~6 endpoint groups | Low | #11 | Pending |
| Bot commands not audited for permissions | Medium | #12 | **FIXED in #12** |

---

## Test Status

| Issue | Unit Tests | Integration Tests | Manual Verification |
|-------|-----------|-------------------|---------------------|
| #6 JWT | - | - | Pending |
| #15 Session | - | - | Pending |
| #14 Auth | - | - | Pending |
| #12 Bot | 52 tests | - | Source code verified |
| #1 Validation | - | - | Pending |
| #8 NoSQL | - | - | Pending |
| #7 XSS | - | - | Pending |
| #9 Files | - | - | Pending |
| #3 CORS | - | - | Pending |
| #4 Headers | - | - | Pending |
| #5 CSRF | - | - | Pending |
| #2 Rate | - | - | Pending |
| #10 Errors | - | - | Pending |
| #11 Audit | - | - | Pending |
| #13 MongoDB | - | - | Pending |

---

*Update this document as each issue is implemented and verified.*
