# فازبندی اجرایی Membership (بدون زمان‌بندی)

## Phase M1 — Packaging + Onboarding
**هدف:** Creator بدون کمک شما onboarding شود

**Acceptance Criteria**
- Landing + Pricing شفاف
- Wizard: creator → plan → content → share
- public creator page قابل share

---

## Phase M2 — پرداخت واقعی + callback امن
**هدف:** پرداخت واقعی بدون double-activate

**Acceptance Criteria**
- WebhookReceipt idempotency (unique(provider, externalId))
- amount mismatch fail
- subscription activation transactional

---

## Phase M3 — تحویل محتوا بدون پشتیبانی
**هدف:** پس از پرداخت، محتوا فقط برای عضو فعال قابل دانلود باشد

**Acceptance Criteria**
- token کوتاه‌عمر + قابل revoke
- guard مرکزی برای entitlement
- unpublished content قابل دسترسی نباشد

---

## Phase M4 — Ops + Reconcile + Cleanups
**هدف:** سیستم self-healing ساده

**Acceptance Criteria**
- job reconcile
- job expire subscription
- job cleanup tokens
- ops summary v1
