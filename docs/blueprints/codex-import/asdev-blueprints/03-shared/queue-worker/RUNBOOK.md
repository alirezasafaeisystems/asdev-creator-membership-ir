# RUNBOOK — ادغام و اجرای Worker Engine

## 1) Prisma
1) محتوای `JOB_MODEL.prisma` را به schema اصلی اضافه کنید.
2) migration:
   - `npx prisma migrate dev -n add_job_queue`

## 2) اجرای Worker
یک runner بسازید (مثلاً `worker/index.ts`) و `workerLoop` را صدا بزنید.

نمونه:

```ts
import { workerLoop } from "../03-shared/queue-worker/engine";
import { auditRunHandler } from "../01-audit/src/worker/audit.handler";
import { reconcilePaymentsHandler, expireSubscriptionsHandler, cleanupDownloadTokensHandler } from "../02-membership/src/worker/membership.handlers";

workerLoop({
  workerId: `worker-${process.pid}`,
  handlers: {
    AUDIT_RUN: auditRunHandler,
    MEMBERSHIP_PAYMENT_RECONCILE: reconcilePaymentsHandler,
    MEMBERSHIP_SUBSCRIPTION_EXPIRE: expireSubscriptionsHandler,
    MEMBERSHIP_DOWNLOAD_TOKEN_CLEANUP: cleanupDownloadTokensHandler,
  },
});
```

## 3) Enqueue job
از `enqueueJob` استفاده کنید:

```ts
import { enqueueJob } from "../03-shared/queue-worker/engine";
await enqueueJob({ type: "AUDIT_RUN", payload: { runId } });
```

## 4) نکات Production
- برای jobهای طولانی از `heartbeat(jobId, workerId)` استفاده کنید.
- برای جلوگیری از طوفان retry، backoff را دستکاری کنید.
- لاگ‌ها را به یک sink پایدار بفرستید.
