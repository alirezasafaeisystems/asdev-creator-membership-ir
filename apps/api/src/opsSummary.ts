import type { Db } from './db';

export type MembershipOpsFindingCode =
  | 'PAYMENT_CALLBACK_IDEMPOTENCY'
  | 'PAYMENT_AMOUNT_MISMATCH'
  | 'PAYMENT_STATUS_INCONSISTENT'
  | 'SUBSCRIPTION_DOUBLE_ACTIVE_SAME_PLAN'
  | 'EXPIRED_SUBSCRIPTION_STILL_HAS_ACCESS'
  | 'DOWNLOAD_TOKEN_ABUSE'
  | 'UNPUBLISHED_CONTENT_ACCESSIBLE'
  | 'OPEN_REDIRECT'
  | 'AUTH_RATE_LIMIT_MISSING'
  | 'PENDING_PAYMENTS_NOT_RECONCILED';

type OpsFinding = {
  code: MembershipOpsFindingCode;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  entity: { type: 'PAYMENT' | 'SUBSCRIPTION' | 'CONTENT' | 'SECURITY'; id?: string };
  message: string;
  recommendation: string;
  evidence?: unknown;
};

export type MembershipOpsSummaryV1 = {
  schema: 'asdev.membership.ops.summary.v1';
  generatedAt: string;
  window: { from: string; to: string };
  metrics: {
    activeSubscriptions: number;
    pendingPayments: number;
    failedPaymentsLast24h: number;
    callbacksLast24h: number;
    expiringNext7d: number;
  };
  findings: OpsFinding[];
  highlights: {
    topFixes: Array<{
      code: MembershipOpsFindingCode;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      effort: 'LOW' | 'MEDIUM' | 'HIGH';
      why: string;
      steps: string[];
    }>;
  };
};

function toNumber(value: unknown) {
  return Number(value || 0);
}

export async function buildMembershipOpsSummary(
  db: Db,
  opts?: { now?: Date; rateLimitConfigured?: boolean },
): Promise<MembershipOpsSummaryV1> {
  const now = opts?.now || new Date();
  const windowFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const findings: OpsFinding[] = [];

  const [activeSubs, pendingPayments, failed24h, callbacks24h, expiring7d] = await Promise.all([
    db.pool.query(`SELECT COUNT(*)::int AS c FROM subscriptions WHERE status='ACTIVE'`),
    db.pool.query(`SELECT COUNT(*)::int AS c FROM payments WHERE status='PENDING'`),
    db.pool.query(`SELECT COUNT(*)::int AS c FROM payments WHERE status='FAILED' AND created_at >= now() - interval '24 hours'`),
    db.pool.query(`SELECT COUNT(*)::int AS c FROM webhook_receipts WHERE created_at >= now() - interval '24 hours'`),
    db.pool.query(
      `SELECT COUNT(*)::int AS c
         FROM subscriptions
        WHERE status='ACTIVE'
          AND current_period_end IS NOT NULL
          AND current_period_end > now()
          AND current_period_end <= now() + interval '7 days'`,
    ),
  ]);

  const callbackDuplicates = await db.pool.query(
    `SELECT gateway, gateway_ref, COUNT(*)::int AS c
       FROM webhook_receipts
      GROUP BY gateway, gateway_ref
     HAVING COUNT(*) > 1
      ORDER BY c DESC
      LIMIT 20`,
  );
  if (Number(callbackDuplicates.rowCount || 0) > 0) {
    findings.push({
      code: 'PAYMENT_CALLBACK_IDEMPOTENCY',
      severity: 'CRITICAL',
      entity: { type: 'PAYMENT' },
      message: 'Webhook callback replay observed for payment gateway references.',
      recommendation: 'Inspect replay source, verify gateway signatures, and review duplicate callback controls.',
      evidence: callbackDuplicates.rows,
    });
  }

  const amountMismatches = await db.pool.query(
    `SELECT p.id, p.gateway, p.gateway_ref, p.amount, p.currency, pe.created_at, pe.raw
       FROM payment_events pe
       JOIN payments p ON p.id = pe.payment_id
      WHERE pe.result='failed'
        AND pe.raw->>'reason'='amount_mismatch'
      ORDER BY pe.created_at DESC
      LIMIT 20`,
  );
  if (Number(amountMismatches.rowCount || 0) > 0) {
    findings.push({
      code: 'PAYMENT_AMOUNT_MISMATCH',
      severity: 'CRITICAL',
      entity: { type: 'PAYMENT' },
      message: 'Payment amount mismatch detected; subscription activation was blocked.',
      recommendation: 'Investigate plan pricing consistency and gateway callback payload integrity.',
      evidence: amountMismatches.rows,
    });
  }

  const inconsistentStatuses = await db.pool.query(
    `SELECT p.id AS payment_id, p.status AS payment_status, s.id AS subscription_id, s.status AS subscription_status
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
      WHERE (p.status='SUCCEEDED' AND s.status <> 'ACTIVE')
         OR (p.status='FAILED' AND s.status='ACTIVE')
      ORDER BY p.created_at DESC
      LIMIT 20`,
  );
  if (Number(inconsistentStatuses.rowCount || 0) > 0) {
    findings.push({
      code: 'PAYMENT_STATUS_INCONSISTENT',
      severity: 'HIGH',
      entity: { type: 'PAYMENT' },
      message: 'Inconsistent payment/subscription state detected.',
      recommendation: 'Run reconcile flow and inspect payment event timeline before manual corrections.',
      evidence: inconsistentStatuses.rows,
    });
  }

  const doubleActive = await db.pool.query(
    `SELECT user_id, creator_id, plan_id, COUNT(*)::int AS c
       FROM subscriptions
      WHERE status='ACTIVE'
      GROUP BY user_id, creator_id, plan_id
     HAVING COUNT(*) > 1
      ORDER BY c DESC
      LIMIT 20`,
  );
  if (Number(doubleActive.rowCount || 0) > 0) {
    findings.push({
      code: 'SUBSCRIPTION_DOUBLE_ACTIVE_SAME_PLAN',
      severity: 'HIGH',
      entity: { type: 'SUBSCRIPTION' },
      message: 'Multiple ACTIVE subscriptions found for the same user/creator/plan.',
      recommendation: 'Merge duplicate subscriptions and verify checkout idempotency keys.',
      evidence: doubleActive.rows,
    });
  }

  const expiredStillActive = await db.pool.query(
    `SELECT id, user_id, creator_id, current_period_end
       FROM subscriptions
      WHERE status='ACTIVE'
        AND current_period_end IS NOT NULL
        AND current_period_end < now()
      ORDER BY current_period_end ASC
      LIMIT 20`,
  );
  if (Number(expiredStillActive.rowCount || 0) > 0) {
    findings.push({
      code: 'EXPIRED_SUBSCRIPTION_STILL_HAS_ACCESS',
      severity: 'HIGH',
      entity: { type: 'SUBSCRIPTION' },
      message: 'Expired subscriptions are still marked as ACTIVE.',
      recommendation: 'Run expiration worker and review membership expiry job schedule.',
      evidence: expiredStillActive.rows,
    });
  }

  const downloadAbuse = await db.pool.query(
    `SELECT actor_user_id, COUNT(*)::int AS issue_count
       FROM audit_events
      WHERE action='content.access_token.issue'
        AND created_at >= now() - interval '24 hours'
      GROUP BY actor_user_id
     HAVING COUNT(*) > 30
      ORDER BY issue_count DESC
      LIMIT 20`,
  );
  if (Number(downloadAbuse.rowCount || 0) > 0) {
    findings.push({
      code: 'DOWNLOAD_TOKEN_ABUSE',
      severity: 'MEDIUM',
      entity: { type: 'CONTENT' },
      message: 'High-frequency content token issuance detected.',
      recommendation: 'Throttle token issuance per user and investigate suspicious traffic sources.',
      evidence: downloadAbuse.rows,
    });
  }

  const unpublishedAccessible = await db.pool.query(
    `SELECT ae.entity_id AS content_id, ae.actor_user_id, ae.created_at
       FROM audit_events ae
       JOIN contents c ON c.id = ae.entity_id
      WHERE ae.action='content.download'
        AND c.is_published=false
      ORDER BY ae.created_at DESC
      LIMIT 20`,
  );
  if (Number(unpublishedAccessible.rowCount || 0) > 0) {
    findings.push({
      code: 'UNPUBLISHED_CONTENT_ACCESSIBLE',
      severity: 'CRITICAL',
      entity: { type: 'CONTENT' },
      message: 'Unpublished content was downloaded according to audit trail.',
      recommendation: 'Block direct access path and rotate download tokens immediately.',
      evidence: unpublishedAccessible.rows,
    });
  }

  const openRedirectHits = await db.pool.query(
    `SELECT id, gateway, gateway_ref, payload, created_at
       FROM webhook_receipts
      WHERE (payload->'payload'->>'callback') ~* '^(https?:)?//'
      ORDER BY created_at DESC
      LIMIT 20`,
  );
  if (Number(openRedirectHits.rowCount || 0) > 0) {
    findings.push({
      code: 'OPEN_REDIRECT',
      severity: 'HIGH',
      entity: { type: 'SECURITY' },
      message: 'Absolute callback redirect targets observed in callback payload.',
      recommendation: 'Force relative-only return/callback URLs and reject absolute targets.',
      evidence: openRedirectHits.rows,
    });
  }

  if (opts?.rateLimitConfigured === false) {
    findings.push({
      code: 'AUTH_RATE_LIMIT_MISSING',
      severity: 'HIGH',
      entity: { type: 'SECURITY' },
      message: 'Auth/callback rate limit policy is not configured.',
      recommendation: 'Enable per-route rate limits for auth and payment callback routes.',
    });
  }

  const stalePending = await db.pool.query(
    `SELECT id, gateway, gateway_ref, created_at
       FROM payments
      WHERE status='PENDING'
        AND created_at < now() - interval '60 minutes'
      ORDER BY created_at ASC
      LIMIT 50`,
  );
  if (Number(stalePending.rowCount || 0) > 0) {
    findings.push({
      code: 'PENDING_PAYMENTS_NOT_RECONCILED',
      severity: 'MEDIUM',
      entity: { type: 'PAYMENT' },
      message: 'Pending payments older than 60 minutes need reconciliation.',
      recommendation: 'Run payment reconcile job and verify provider callback delivery.',
      evidence: stalePending.rows,
    });
  }

  const severityImpact: Record<OpsFinding['severity'], 'HIGH' | 'MEDIUM' | 'LOW'> = {
    CRITICAL: 'HIGH',
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW',
  };

  return {
    schema: 'asdev.membership.ops.summary.v1',
    generatedAt: now.toISOString(),
    window: { from: windowFrom.toISOString(), to: now.toISOString() },
    metrics: {
      activeSubscriptions: toNumber(activeSubs.rows[0]?.c),
      pendingPayments: toNumber(pendingPayments.rows[0]?.c),
      failedPaymentsLast24h: toNumber(failed24h.rows[0]?.c),
      callbacksLast24h: toNumber(callbacks24h.rows[0]?.c),
      expiringNext7d: toNumber(expiring7d.rows[0]?.c),
    },
    findings,
    highlights: {
      topFixes: findings.slice(0, 3).map((f) => ({
        code: f.code,
        impact: severityImpact[f.severity],
        effort: f.severity === 'CRITICAL' || f.severity === 'HIGH' ? 'MEDIUM' : 'LOW',
        why: f.message,
        steps: [f.recommendation],
      })),
    },
  };
}
