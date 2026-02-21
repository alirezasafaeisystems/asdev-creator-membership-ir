# Routeهای دقیق (Next.js App Router) — Membership

```txt
app/
  (marketing)/
    page.tsx
    pricing/page.tsx
    features/page.tsx
    legal/terms/page.tsx
    legal/privacy/page.tsx
  (auth)/
    signup/page.tsx
    signin/page.tsx
    signout/route.ts
  (public)/
    creators/page.tsx
    creators/[slug]/page.tsx
    creators/[slug]/plans/[planId]/page.tsx
  (checkout)/
    checkout/[planId]/page.tsx
    checkout/success/page.tsx
    checkout/failed/page.tsx
  (member)/
    me/page.tsx
    me/subscriptions/page.tsx
    me/content/page.tsx
    me/content/[contentId]/page.tsx
  (creator-dashboard)/
    dashboard/page.tsx
    dashboard/plans/page.tsx
    dashboard/content/page.tsx
    dashboard/content/new/page.tsx
    dashboard/members/page.tsx
    dashboard/settings/page.tsx
  (admin)/
    admin/page.tsx
    admin/payments/page.tsx
    admin/reconcile/page.tsx
  api/
    auth/signup/route.ts
    auth/signin/route.ts
    checkout/create/route.ts
    payments/callback/route.ts
    download/[token]/route.ts
    payments/reconcile/route.ts
```

## نکته اجرایی
- public creator page باید SSR/SSG friendly باشد (برای share و SEO)
- returnUrl فقط relative path باشد (ضد open redirect)
