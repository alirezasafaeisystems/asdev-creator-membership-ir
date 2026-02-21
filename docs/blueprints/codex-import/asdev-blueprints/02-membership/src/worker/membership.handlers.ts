// 02-membership/src/worker/membership.handlers.ts
// Handlerهای Worker برای self-healing و maintenance

import { PrismaClient } from "@prisma/client";
import type { JobHandler } from "../../03-shared/queue-worker/engine"; // مسیر را در پروژه خودتان اصلاح کنید

const prisma = new PrismaClient();

export const reconcilePaymentsHandler: JobHandler = async (_job, signal) => {
  const pending = await prisma.payment.findMany({
    where: { status: "PENDING" },
    take: 50,
    orderBy: { createdAt: "asc" },
  });

  for (const p of pending) {
    if (signal.aborted) throw signal.reason;

    // TODO: status را از درگاه query کنید.
    // const status = await provider.checkStatus(p.providerAuthority, { signal });

    // TODO: اگر SUCCEEDED شد:
    // 1) payment.status = SUCCEEDED
    // 2) subscription.status = ACTIVE (transactional)
    // 3) PaymentEvent ثبت کنید
  }
};

export const expireSubscriptionsHandler: JobHandler = async (_job, signal) => {
  if (signal.aborted) throw signal.reason;

  await prisma.subscription.updateMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
};

export const cleanupDownloadTokensHandler: JobHandler = async (_job, signal) => {
  if (signal.aborted) throw signal.reason;

  await prisma.downloadToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
};
