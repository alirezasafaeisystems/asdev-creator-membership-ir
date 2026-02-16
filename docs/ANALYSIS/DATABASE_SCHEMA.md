# DATABASE_SCHEMA — طرح دیتابیس، ERD و ایندکس‌ها (PostgreSQL)

## اصول
- کلیدها: UUID
- timestamps: `created_at`, `updated_at`
- soft delete: `deleted_at` برای موجودیت‌های حساس (اختیاری)
- پول: **ریال/تومان** را واضح مشخص کن. پیشنهاد: ذخیره در «ریال» به صورت integer.

---

## ERD (Mermaid)

```mermaid
erDiagram
  users ||--o| creators : "optional (role=creator)"
  creators ||--o{ plans : "has"
  users ||--o{ subscriptions : "has"
  plans ||--o{ subscriptions : "plan"
  subscriptions ||--o{ payments : "paid by"
  creators ||--o{ contents : "owns"
  users ||--o{ downloads : "performed"
  contents ||--o{ downloads : "downloaded"
  creators ||--o{ payout_requests : "requests"
  users ||--o{ audit_events : "actor"

  users {
    uuid id PK
    text email UK
    text password_hash
    text name
    text role
    timestamptz created_at
    timestamptz updated_at
  }

  creators {
    uuid id PK
    uuid user_id FK
    text slug UK
    text display_name
    text bio
    jsonb social_links
    timestamptz created_at
    timestamptz updated_at
  }

  plans {
    uuid id PK
    uuid creator_id FK
    text title
    text description
    int price_amount
    text currency
    text interval
    bool is_active
    timestamptz created_at
    timestamptz updated_at
  }

  subscriptions {
    uuid id PK
    uuid user_id FK
    uuid creator_id FK
    uuid plan_id FK
    text status
    timestamptz started_at
    timestamptz current_period_end
    timestamptz canceled_at
    timestamptz created_at
    timestamptz updated_at
  }

  payments {
    uuid id PK
    uuid subscription_id FK
    uuid creator_id FK
    uuid user_id FK
    int amount
    text currency
    text gateway
    text status
    text gateway_ref
    text idempotency_key
    timestamptz paid_at
    timestamptz created_at
  }

  contents {
    uuid id PK
    uuid creator_id FK
    text type
    text title
    text slug
    text access_level
    text storage_key
    jsonb meta
    bool is_published
    timestamptz created_at
    timestamptz updated_at
  }

  downloads {
    uuid id PK
    uuid user_id FK
    uuid content_id FK
    uuid creator_id FK
    text ip_hash
    timestamptz created_at
  }

  payout_requests {
    uuid id PK
    uuid creator_id FK
    int amount
    text status
    timestamptz requested_at
    timestamptz processed_at
  }

  audit_events {
    uuid id PK
    uuid actor_user_id FK
    text action
    jsonb payload
    timestamptz created_at
  }
```

---

## ایندکس‌ها (پیشنهادی)
- `users(email)` unique
- `creators(slug)` unique
- `plans(creator_id, is_active)`
- `subscriptions(user_id, status)`, `subscriptions(creator_id, status)`
- `payments(gateway, gateway_ref)` unique (برای جلوگیری از duplicate callback)
- `payments(idempotency_key)` unique nullable
- `contents(creator_id, is_published)`, `contents(creator_id, slug)` unique per creator
- `downloads(user_id, created_at)`

---

## نکته‌های ضدتقلب/امنیت
- در downloads: ip_hash (نه ip خام) + rate limit سمت API
- storage_key برای فایل‌ها فقط در سرور resolve می‌شود (لینک مستقیم public نده)
