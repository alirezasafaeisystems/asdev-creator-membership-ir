// 02-membership/src/lib/downloadToken.ts
// صدور توکن کوتاه‌عمر برای دانلود امن

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { assertUserCanAccessAsset } from "./entitlementGuard";

const prisma = new PrismaClient();

export async function issueDownloadToken(params: { userId: string; assetId: string; ttlSeconds?: number }) {
  const ttl = params.ttlSeconds ?? 10 * 60; // 10 minutes
  await assertUserCanAccessAsset({ userId: params.userId, assetId: params.assetId });

  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + ttl * 1000);

  const row = await prisma.downloadToken.create({
    data: {
      token,
      assetId: params.assetId,
      userId: params.userId,
      expiresAt,
    },
  });

  return row.token;
}
