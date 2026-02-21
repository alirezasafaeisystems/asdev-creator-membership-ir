// 02-membership/src/lib/opsSummary.types.ts

export type MembershipOpsSummaryV1 = {
  schema: "asdev.membership.ops.summary.v1";
  generatedAt: string;

  window: { from: string; to: string };

  metrics: {
    activeSubscriptions: number;
    pendingPayments: number;
    failedPaymentsLast24h: number;
    callbacksLast24h: number;
    expiringNext7d: number;
  };

  findings: Array<{
    code: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    entity: { type: "PAYMENT" | "SUBSCRIPTION" | "CONTENT" | "SECURITY"; id?: string };
    message: string;
    recommendation: string;
    evidence?: any;
  }>;

  highlights: {
    topFixes: Array<{
      code: string;
      impact: "HIGH" | "MEDIUM" | "LOW";
      effort: "LOW" | "MEDIUM" | "HIGH";
      why: string;
      steps: string[];
    }>;
  };
};
