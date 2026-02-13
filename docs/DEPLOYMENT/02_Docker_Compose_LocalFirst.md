# Compose Local-first
نسخه: 1.1

## اجرا
```bash
docker compose -f ops/compose.local.yml up -d
docker compose -f ops/compose.local.yml ps
```

## سرویس ها
- postgres: `localhost:5432`
- minio api: `localhost:9000`
- minio console: `localhost:9001`
- nginx: `localhost:8080`

## خاموش کردن
```bash
docker compose -f ops/compose.local.yml down
```

## نکته
در این فاز، `api` و `web` هنوز به compose اضافه نشده اند و به صورت قرارداد مستندی مدیریت می شوند.
