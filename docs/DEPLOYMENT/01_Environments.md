# 01 Environments

## Local (Primary)
- API: `127.0.0.1:4000`
- Web: `127.0.0.1:3000`
- DB: local PostgreSQL

## Required Variables
- `DATABASE_URL`
- `PUBLIC_BASE_URL`
- `SESSION_SECRET`
- payment provider vars when non-mock gateway is used

## Environment Policy
- local-first first-class path
- no runtime dependency on external SaaS/CDN
- production-only secrets never committed
