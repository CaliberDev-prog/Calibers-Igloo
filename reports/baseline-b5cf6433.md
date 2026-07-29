# Performance Baseline Report

Generated: 2026-07-29T11:55:08.100Z
Commit SHA: `b5cf64335caca9672f291e26f82e6dc3a7c52222`
Node: v24.16.0
Platform: win32 (x64)
Environment: development

## Methodology

Synthetic baseline using gaussian-distributed timing data simulating real traffic patterns.

- Outlier rate: 1% of requests received 3-6x normal latency to simulate real-world tail latency
- Dataset: 5500 total simulated requests
- Concurrency: Requests generated sequentially (no concurrent load)

## Cold Start Timing

| Phase | Duration (ms) | Since Previous (ms) |
|-------|---------------|---------------------|
| importsLoaded | 12 | 12 |
| mongodbConnect | 450 | 438 |
| clientReady | 820 | 370 |

## Warm Start Timing

| Phase | Duration (ms) | Since Previous (ms) |
|-------|---------------|---------------------|
| importsLoaded | 8 | 8 |
| mongodbConnect | 120 | 112 |
| clientReady | 200 | 80 |

## API Endpoint Response Times

| Endpoint | Count | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) |
|----------|-------|----------|----------|----------|----------|
| GET /api/audit-logs | 200 | 46.47 | 43 | 94 | 283.29 |
| GET /api/blacklists | 200 | 29.21 | 27 | 74 | 90 |
| GET /api/commands | 200 | 22.92 | 19 | 55 | 89.56 |
| GET /api/config | 200 | 32.91 | 26 | 79 | 107 |
| GET /api/discord/channels | 200 | 94.2 | 78 | 208 | 262 |
| GET /api/discord/roles | 200 | 77.97 | 66 | 181 | 256 |
| GET /api/giveaways | 200 | 39.74 | 38 | 90 | 111 |
| GET /api/health | 200 | 6.95 | 5 | 17 | 19 |
| GET /api/messages | 200 | 55.84 | 54 | 109 | 150 |
| GET /api/overview | 200 | 54.62 | 45 | 139 | 179 |
| GET /api/tickets | 200 | 67.77 | 62 | 164 | 301.33 |
| GET /api/tickets/:id | 200 | 45.04 | 40 | 104 | 157.38 |
| GET /api/users | 200 | 64.49 | 59 | 131 | 207.94 |
| POST /api/auth/login | 200 | 101.91 | 98 | 207 | 369 |
| POST /api/auth/refresh | 200 | 57.28 | 49 | 128 | 183 |

## MongoDB Query Durations

| Operation | Count | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) |
|-----------|-------|----------|----------|----------|----------|
| AuditLog.find | 250 | 25.62 | 21 | 74 | 89 |
| DashboardUser.findOne | 250 | 7.06 | 5 | 21 | 27 |
| Giveaway.find | 250 | 13.13 | 9 | 36 | 52 |
| Ticket.countDocuments | 250 | 26.31 | 24 | 70 | 93 |
| Ticket.find | 250 | 19.45 | 13 | 64 | 77 |
| Ticket.findOne | 250 | 10.96 | 8 | 31 | 50 |
| Ticket.findOneAndUpdate | 250 | 15.08 | 12 | 42 | 52 |
| Ticket.insertOne | 250 | 10.89 | 9 | 32 | 40 |

## Command Execution Times

| Command | Count | Avg (ms) | p50 (ms) | p95 (ms) | p99 (ms) |
|---------|-------|----------|----------|----------|----------|
| moderation | 83 | 272.59 | 250 | 779 | 953 |
| panel | 83 | 308.18 | 296 | 705 | 1131 |
| ping | 83 | 61.08 | 54 | 140 | 171 |
| reminder | 83 | 115.18 | 104 | 319 | 380 |
| setup | 84 | 1637.87 | 1649 | 3909 | 4952 |
| ticket | 84 | 184.74 | 133 | 514 | 666 |

## Budget Compliance

| Budget | Target | Actual | Status |
|--------|--------|--------|--------|
| API p50 < 200ms | 200ms | 47ms | PASS |
| API p95 < 500ms | 500ms | 119ms | PASS |
| API p99 < 2s | 2000ms | 184ms | PASS |
| MongoDB p95 < 100ms | 100ms | 74ms | PASS |
| Bot command < 3s | 3000ms | 3909ms | FAIL |
| Health endpoint < 100ms | 100ms | 17ms | PASS |

## Slow Request and Query Summary

- Slow requests (>2s): 0
- Slow queries (>100ms): 0
- Error responses (4xx/5xx): N/A

## Known Limitations

- Synthetic data approximates real traffic distributions but is not actual production traffic
- No concurrent request testing (all requests sequential)
- MongoDB timings estimated based on typical Atlas M0 cluster performance
- Cold/warm start times estimated for typical Render free-tier cold boot
- No rate-limited or throttled request testing
- Static asset delivery and CDN caching not measured
- Client-side rendering performance not measured

## How to Run Against Live Deployment

1. Deploy the current commit to Render.
2. Authenticate as owner and generate a JWT token.
3. Hit the API with realistic traffic for 5-10 minutes.
4. Call `GET /api/performance/metrics` with owner token to get the live report.
5. Compare against this synthetic baseline.
