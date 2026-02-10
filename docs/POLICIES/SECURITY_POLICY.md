# سیاست امنیت
نسخه: 1.1

## Secrets
- نگهداری secret در repository ممنوع است.
- تمام secretها از طریق محیط امن (CI secrets / runtime env) تزریق می‌شوند.

## Access Control
- دسترسی admin فقط با RBAC و allowlist معتبر مجاز است.
- مسیرهای حساس auth/payment باید کنترل مجوز صریح داشته باشند.

## Incident Response
- رخداد امنیتی (افشای secret، bypass دسترسی، replay webhook) باید incident ثبت کند.
- شامل triage، containment، remediation و postmortem مستند.

## Vulnerability Handling
- آسیب‌پذیری‌های بحرانی باید خارج از چرخه انتشار عادی، فوری رفع شوند.
- تغییرات امنیتی باید evidence تست و بازبینی داشته باشند.
