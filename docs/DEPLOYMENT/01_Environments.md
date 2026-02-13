# محیط ها
نسخه: 1.1

## local
- postgres + minio + nginx
- برای توسعه و اعتبارسنجی کیفیت

## stage
- نزدیک به prod با داده غیرحساس
- smoke test قبل از release

## prod
- TLS اجباری
- secret خارج از repo
- backup قبل از migration
