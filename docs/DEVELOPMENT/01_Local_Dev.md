# راه اندازی لوکال
نسخه: 1.1

## پیش نیاز
- Docker + Docker Compose
- Node.js 20+
- pnpm 9+

## اجرای سرویس های زیرساخت
```bash
docker compose -f ops/compose.local.yml up -d
```

## health check پایه
```bash
docker compose -f ops/compose.local.yml ps
curl -sS http://localhost:8080/
curl -sS http://localhost:8080/health
```

## اجرای quality gates
```bash
pnpm install --frozen-lockfile || pnpm install
pnpm -w docs:validate
pnpm -w lint
pnpm -w typecheck
pnpm -w test:unit
pnpm -w test:integration
pnpm -w test:e2e
pnpm -w security:scan
```

## توقف سرویس ها
```bash
docker compose -f ops/compose.local.yml down
```
