# START HERE — راهنمای سریع اجرای Blueprint

این راهنما کمک می‌کند بدون زمان‌بندی، **مرحله‌به‌مرحله و اجرایی** جلو بروید.

---

## اصول تصمیم‌گیری اجرایی (برای اینکه وسط راه پراکنده نشوید)

### 1) هر مرحله باید خروجی قابل مشاهده داشته باشد
- صفحه‌ای که رندر شود
- API که کار کند
- یک Job که اجرا شود
- یک Report Summary که ذخیره شود

### 2) هر مرحله باید معیار پذیرش (Acceptance Criteria) داشته باشد
در `PHASES.md` هر پروژه معیارها نوشته شده است.

### 3) از روز اول telemetry حداقلی داشته باشید
- برای Audit: eventهای funnel + duration + errorCode
- برای Membership: payment lifecycle + idempotency receipts

---

## اجرای مرحله‌ای (بدون وابستگی به زمان)

### گام 0 — انتخاب معماری Repo
دو حالت رایج:

**A) Monorepo (پیشنهادی)**
- `apps/web-audit` (Next.js)
- `apps/web-membership` (Next.js)
- `packages/shared` (queue-engine، types، utils)
- DB مشترک یا جدا

**B) دو Repo جدا**
- سریع‌تر برای شروع، ولی code-sharing کمتر

---

## چک‌لیست آماده‌سازی محیط (Common)

- Node.js LTS
- Postgres
- Prisma
- یک راه اجرای worker (مثلاً `node worker/index.ts`)

---

## مسیر سریع پیشنهادی برای شما

### اول: Shared Queue Engine (یکبار برای همیشه)
1) فایل‌های `03-shared/queue-worker/*` را وارد پروژه کنید
2) مدل `Job` را به Prisma schema اضافه کنید
3) یک Worker runner بسازید که `workerLoop` را صدا بزند

✅ خروجی: Queue/Worker آماده، قابل استفاده برای هر دو پروژه

---

### دوم: Audit MVP (Scanner + Report)
1) مدل‌های Prisma Audit را اضافه کنید (`01-audit/prisma/schema.audit.prisma`)
2) URL normalize + SSRF guard را اضافه کنید
3) fetch HTML + استخراج منابع + ۱۰ rule اولیه
4) Summary JSON v1 را بسازید و در DB ذخیره کنید
5) Route report را رندر کنید

✅ خروجی: یک report shareable که واقعا “چیز معنی‌دار” نشان می‌دهد

---

### سوم: Membership MVP (First Sale)
1) normalize slug/email/returnUrl را اضافه کنید
2) checkout + callback idempotency را enforce کنید
3) download token + entitlement guard را پیاده کنید
4) یک Ops summary + reconcile job بسازید

✅ خروجی: پرداخت → فعال‌سازی → دسترسی محتوا (بدون پشتیبانی دستی)

---

## پیوست
- Audit phases: `../01-audit/docs/PHASES.md`
- Membership phases: `../02-membership/docs/PHASES.md`
- Shared worker: `../03-shared/queue-worker/engine.ts`

