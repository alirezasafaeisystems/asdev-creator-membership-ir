# Queue/Worker مشترک (DB-backed)

هدف: یک صف ساده و قابل اتکا برای MVP که:

- بدون Redis/RabbitMQ اجرا شود
- Retry + Backoff داشته باشد
- Timeout داشته باشد
- Lock + Lease برای crash worker داشته باشد
- قابل استفاده برای Audit و Membership باشد

---

## فایل‌ها

- `JOB_MODEL.prisma` — مدل Prisma برای جدول Job
- `engine.ts` — موتور queue/worker
- `RUNBOOK.md` — دستورالعمل ادغام و اجرا

