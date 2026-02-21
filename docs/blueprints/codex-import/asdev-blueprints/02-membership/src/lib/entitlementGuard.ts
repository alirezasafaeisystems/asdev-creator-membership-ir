// 02-membership/src/lib/entitlementGuard.ts
// Guard مرکزی برای اینکه فقط اعضای مجاز بتوانند asset دانلود کنند.
// این guard را هم در UI (server actions) و هم در API download route استفاده کنید.

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function assertUserCanAccessAsset(params: { userId: string; assetId: string }) {
  const asset = await prisma.asset.findUnique({
    where: { id: params.assetId },
    include: {
      content: {
        include: {
          accessRules: true,
        },
      },
    },
  });

  if (!asset) throw new Error("ASSET_NOT_FOUND");
  if (!asset.content.isPublished) throw new Error("CONTENT_NOT_PUBLISHED");

  // find planIds that grant access
  const planIds = asset.content.accessRules.map((r) => r.planId);
  if (!planIds.length) throw new Error("NO_ACCESS_RULES");

  // check user active subscription for any of these plans
  const sub = await prisma.subscription.findFirst({
    where: {
      userId: params.userId,
      planId: { in: planIds },
      status: "ACTIVE",
    },
  });

  if (!sub) throw new Error("NO_ACTIVE_SUBSCRIPTION");

  return { asset, subscription: sub };
}
