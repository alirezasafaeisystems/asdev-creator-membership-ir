# API_MAP — قرارداد API (REST + GraphQL) و استانداردها

## تصمیم: REST برای لایه عملیاتی + GraphQL برای UI پیشرفته
- REST:
  - بهترین برای Webhook/Callback پرداخت، فایل دانلود، health checks، ادغام‌های ساده
- GraphQL:
  - بهترین برای داشبوردها (Creator/User/Admin) چون داده ترکیبی و فیلتر زیاد است.

> هر دو روی یک domain/service اجرا می‌شوند و auth یکپارچه دارند.

---

## اصول مشترک
- Versioning:
  - REST: `/api/v1/...`
  - GraphQL: یک endpoint ثابت `/graphql` + versioning از طریق schema evolution
- Error model:
  - REST: `{ code, message, details?, traceId? }`
  - GraphQL: `extensions.code` + `extensions.traceId`
- Idempotency:
  - REST پرداخت: `Idempotency-Key` header (اختیاری ولی توصیه‌شده)
- Pagination:
  - REST: `?page=&limit=` یا cursor
  - GraphQL: Connection pattern (cursor)

---

## REST Endpoints (v1)

### Auth
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/signin`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/signout`
- `POST /api/v1/auth/otp/request` (اختیاری)
- `POST /api/v1/auth/otp/verify` (اختیاری)

### Public (SEO)
- `GET /api/v1/creators` (list + filter)
- `GET /api/v1/creators/:slug`
- `GET /api/v1/creators/:slug/plans`
- `GET /api/v1/content/:id/preview` (نمونه عمومی)

### Subscriptions
- `POST /api/v1/subscriptions/checkout`  (شروع پرداخت)
- `POST /api/v1/subscriptions/cancel`
- `GET  /api/v1/subscriptions/me`

### Payments (Gateway callbacks)
- `POST /api/v1/payments/:gateway/callback`
- `GET  /api/v1/payments/me`
- `POST /api/v1/payments/reconcile` (Admin only)

### Content (Protected)
- `POST /api/v1/content` (upload metadata)
- `POST /api/v1/content/:id/publish`
- `GET  /api/v1/content/:id` (requires membership)
- `GET  /api/v1/download/:token` (signed token)

### Admin
- `GET  /api/v1/admin/creators`
- `GET  /api/v1/admin/payments`
- `POST /api/v1/admin/ban`
- `POST /api/v1/admin/refund` (اگر پشتیبانی شود)

---

## GraphQL (Core Schema)

### Types (نمونه)
- User, Creator, Plan, Subscription, Payment, Content, PayoutRequest, AuditEvent

### Queries
- `me`
- `creatorBySlug(slug)`
- `creators(filter, pagination)`
- `mySubscriptions`
- `myPayments`
- `creatorDashboard(creatorId)`
- `adminDashboard`

### Mutations
- `authSignUp`, `authSignIn`, `authRefresh`, `authSignOut`
- `creatorCreate`, `creatorUpdate`
- `planCreate`, `planUpdate`, `planArchive`
- `subscriptionCheckout(planId, couponCode?)`
- `subscriptionCancel(subscriptionId)`
- `contentCreate`, `contentPublish`, `contentUnpublish`, `contentDelete`
- `payoutRequestCreate`, `payoutRequestCancel`
- `adminAction...`

---

## Status machine (Subscription)
- `PENDING_PAYMENT` → `ACTIVE` → (`CANCELED` | `EXPIRED`)
- Grace period (اختیاری): `PAST_DUE` → `ACTIVE` یا `EXPIRED`

---

## کدهای خطای پیشنهادی
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_EMAIL_NOT_VERIFIED` (اختیاری)
- `PAYMENT_CALLBACK_INVALID`
- `PAYMENT_DUPLICATE_CALLBACK`
- `SUBSCRIPTION_NOT_ACTIVE`
- `CONTENT_FORBIDDEN`
- `RATE_LIMITED`
