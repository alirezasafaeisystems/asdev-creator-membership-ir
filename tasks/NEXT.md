# Next Tasks (Execution Backlog)

> تاریخ: 2026-02-16  
> وضعیت فعلی: `apps/web` اسکلت UI + `apps/api` هسته MVP (Auth/Creator/Plans/Checkout/Mock Gateway/Audit/Admin) آماده است.

## P1 — تکمیل MVP پرداخت/اشتراک (Hardening)
- [ ] اضافه کردن سرویس‌های `apps/api` و `apps/web` به `ops/compose.local.yml` + reverse proxy در nginx (مسیرهای `/` و `/api/*`)
- [ ] تعریف `PaymentGatewayAdapter` واقعی برای حداقل یک درگاه (مثلاً Zarinpal یا IDPay) با:
  - [ ] validate امضای callback/webhook → خطا `PAYMENT_WEBHOOK_SIGNATURE_INVALID`
  - [ ] timeout handling → خطا `PAYMENT_PROVIDER_TIMEOUT`
  - [ ] حالت‌های پرداخت (pending/success/fail) و ثبت `raw` در audit payload
- [ ] سخت‌کردن idempotency:
  - [ ] پشتیبانی از `Idempotency-Key` برای `POST /api/v1/subscriptions/checkout`
  - [ ] جلوگیری از دوبار فعال شدن اشتراک در callback (already ok، ولی تست سناریویی اضافه شود)
- [ ] اضافه کردن `POST /api/v1/subscriptions/cancel` (فقط صاحب اشتراک) + audit event `subscription.cancel`
- [ ] اضافه کردن `GET /api/v1/payments/:id` برای کاربر صاحب پرداخت
- [ ] اضافه کردن health checks کامل:
  - [ ] `GET /health` برای API (already ok)
  - [ ] `GET /api/v1/health/db` (connection check)

## Security/RBAC (پایه)
- [ ] جایگزینی `x-admin-key` با RBAC واقعی (role-based) + session auth:
  - [ ] roles حداقل: `platform_admin`, `support_admin`, `auditor`
  - [ ] enforce مسیرها مطابق `docs/ARCHITECTURE/RBAC_Matrix.md`
- [ ] اضافه کردن rate limit سخت‌تر برای auth و callback پرداخت (per-IP + per-route)
- [ ] محدود کردن CORS (فعلاً بسته) و اضافه کردن `PUBLIC_BASE_URL` معتبر برای ساخت callback URL

## Data/Finance correctness
- [ ] تعریف دقیق واحد پول (IRR vs IRT) و enforce در API/DB
- [ ] اضافه کردن `payment_intent` داخلی (شناسه پایدار) و مپ به `gateway_ref`
- [ ] reconciliation قابل اتکا:
  - [ ] `POST /api/v1/payments/reconcile` باید واقعی‌تر شود (query درگاه + گزارش)

## P2 — Content Protection + Search + SEO baseline
- [ ] طراحی ماژول Content + Storage (Disk/Nginx X-Accel یا MinIO) با لینک دانلود tokenized
- [ ] ساخت endpoint دانلود امن: `GET /api/v1/download/:token`
- [ ] اضافه کردن حداقل search/filter برای creators/plans (REST یا GraphQL)
- [ ] صفحات عمومی Creator در Web با SSG/SSR (بدون CDN)

## DX / Ops
- [ ] اضافه کردن فایل `apps/api/.env.example` و تکمیل `.env.example` ریشه برای:
  - `DATABASE_URL`, `PUBLIC_BASE_URL`, `ADMIN_API_KEY`, `PAYMENT_GATEWAY`, `PAYMENT_GATEWAY_BASE_URL`
- [ ] اضافه کردن README اجرای محلی (3 دستور) + نمونه curl سناریو پرداخت mock
- [ ] اضافه کردن اسکریپت smoke ساده: create user → create creator/plan → checkout → callback → verify subscription ACTIVE

## Commands (current)
- `pnpm -w build`
- `pnpm api:dev` (نیازمند `DATABASE_URL`)
- `pnpm dev` (web)
- `pnpm -w local-first:scan`

