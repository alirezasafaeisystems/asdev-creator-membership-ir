import type { FastifyInstance } from 'fastify';
import type { Db } from './db';
import { ApiError } from './http';
import { applyPaymentResult, createPaymentGatewayAdapter } from './payments';
import { auditEvent } from './audit';
import { getUserBySession } from './auth';
import { buildMembershipOpsSummary } from './opsSummary';

export function registerAdminRoutes(app: FastifyInstance, db: Db, opts: {
  publicBaseUrl: string;
  paymentGatewayBaseUrl: string;
  paymentGatewayWebhookSecret: string;
  paymentGatewayTimeoutMs: number;
}) {
  function getAuthToken(req: any): string | null {
    const h = String(req.headers.authorization || '');
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) return null;
    return m[1];
  }

  async function requireAdminRole(req: any, allowedRoles: Array<'platform_admin' | 'support_admin' | 'auditor'>) {
    const token = getAuthToken(req);
    if (!token) throw new ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
    const user = await getUserBySession(db, token);
    if (!user) throw new ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
    if (!allowedRoles.includes(String(user.role) as any)) {
      throw new ApiError('AUTH_FORBIDDEN', 'Forbidden', 403, {
        requiredRoles: allowedRoles,
        userRole: user.role,
      });
    }
    return user;
  }

  app.get('/api/v1/admin/payments', async (req: any) => {
    await requireAdminRole(req, ['platform_admin', 'support_admin', 'auditor']);
    const limit = Math.min(Number(req.query?.limit || 50), 200);
    const r = await db.pool.query(
      `SELECT p.*, s.status as subscription_status
         FROM payments p
         JOIN subscriptions s ON s.id=p.subscription_id
        ORDER BY p.created_at DESC
        LIMIT $1`,
      [limit],
    );
    return { items: r.rows };
  });

  app.get('/api/v1/admin/payments/:id', async (req: any) => {
    await requireAdminRole(req, ['platform_admin', 'support_admin', 'auditor']);
    const r = await db.pool.query(
      `SELECT p.*, s.status as subscription_status
         FROM payments p
         JOIN subscriptions s ON s.id=p.subscription_id
        WHERE p.id=$1`,
      [req.params.id],
    );
    if (r.rowCount !== 1) throw new ApiError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
    return r.rows[0];
  });

  app.get('/api/v1/admin/payments/:id/events', async (req: any) => {
    await requireAdminRole(req, ['platform_admin', 'support_admin', 'auditor']);
    const limit = Math.max(1, Math.min(200, Number(req.query?.limit || 100)));
    const r = await db.pool.query(
      `SELECT *
         FROM payment_events
        WHERE payment_id=$1
        ORDER BY created_at DESC
        LIMIT $2`,
      [req.params.id, limit],
    );
    return { items: r.rows };
  });

  app.get('/api/v1/admin/audit', async (req: any) => {
    await requireAdminRole(req, ['platform_admin', 'auditor']);
    const limit = Math.min(Number(req.query?.limit || 50), 200);
    const entityType = req.query?.entityType ? String(req.query.entityType) : null;
    const entityId = req.query?.entityId ? String(req.query.entityId) : null;
    const where: string[] = [];
    const params: any[] = [];
    if (entityType) {
      params.push(entityType);
      where.push(`entity_type=$${params.length}`);
    }
    if (entityId) {
      params.push(entityId);
      where.push(`entity_id::text=$${params.length}`);
    }
    params.push(limit);
    const sql =
      `SELECT * FROM audit_events ` +
      (where.length ? `WHERE ${where.join(' AND ')} ` : '') +
      `ORDER BY created_at DESC LIMIT $${params.length}`;
    const r = await db.pool.query(sql, params);
    return { items: r.rows };
  });

  app.get('/api/v1/admin/overview', async (req: any) => {
    await requireAdminRole(req, ['platform_admin', 'support_admin', 'auditor']);
    const [users, creators, plans, subscriptions, payments, audits] = await Promise.all([
      db.pool.query(`SELECT COUNT(*)::int AS c FROM users`),
      db.pool.query(`SELECT COUNT(*)::int AS c FROM creators`),
      db.pool.query(`SELECT COUNT(*)::int AS c FROM plans WHERE is_active=true`),
      db.pool.query(
        `SELECT status, COUNT(*)::int AS c
           FROM subscriptions
          GROUP BY status`,
      ),
      db.pool.query(
        `SELECT status, COUNT(*)::int AS c
           FROM payments
          GROUP BY status`,
      ),
      db.pool.query(
        `SELECT action, created_at
           FROM audit_events
          ORDER BY created_at DESC
          LIMIT 10`,
      ),
    ]);

    const subscriptionByStatus: Record<string, number> = {};
    for (const row of subscriptions.rows as any[]) subscriptionByStatus[String(row.status)] = Number(row.c || 0);

    const paymentByStatus: Record<string, number> = {};
    for (const row of payments.rows as any[]) paymentByStatus[String(row.status)] = Number(row.c || 0);

    return {
      counts: {
        users: Number(users.rows[0]?.c || 0),
        creators: Number(creators.rows[0]?.c || 0),
        activePlans: Number(plans.rows[0]?.c || 0),
      },
      subscriptions: subscriptionByStatus,
      payments: paymentByStatus,
      recentAudit: audits.rows,
    };
  });

  app.get('/api/v1/admin/ops/summary', async (req: any) => {
    await requireAdminRole(req, ['platform_admin', 'support_admin', 'auditor']);
    return buildMembershipOpsSummary(db, { rateLimitConfigured: true });
  });

  app.get('/api/admin/ops/summary', async (req: any) => {
    await requireAdminRole(req, ['platform_admin', 'support_admin', 'auditor']);
    return buildMembershipOpsSummary(db, { rateLimitConfigured: true });
  });

  // Reconcile pending payments through adapter and return structured report.
  app.post('/api/v1/payments/reconcile', async (req: any) => {
    const adminUser = await requireAdminRole(req, ['platform_admin', 'support_admin']);
    const traceId = String(req.traceId || '');
    const minutes = Math.max(5, Number(req.body?.olderThanMinutes || 60));
    const limit = Math.max(1, Math.min(500, Number(req.body?.limit || 100)));
    const pending = await db.pool.query(
      `SELECT *
         FROM payments
        WHERE status='PENDING'
          AND created_at < (now() - ($1::int || ' minutes')::interval)
        ORDER BY created_at ASC
        LIMIT $2`,
      [minutes, limit],
    );
    const items: Array<{
      paymentId: string;
      gateway: string;
      gatewayRef: string | null;
      result: string;
      statusAfter?: string;
      reason?: string;
    }> = [];

    for (const payment of pending.rows as any[]) {
      if (!payment.gateway_ref) {
        items.push({
          paymentId: payment.id,
          gateway: payment.gateway,
          gatewayRef: null,
          result: 'skipped',
          reason: 'missing_gateway_ref',
        });
        continue;
      }

      try {
        const adapter = createPaymentGatewayAdapter({
          gatewayId: payment.gateway,
          baseUrl: opts.paymentGatewayBaseUrl || opts.publicBaseUrl,
          webhookSecret: opts.paymentGatewayWebhookSecret,
          timeoutMs: opts.paymentGatewayTimeoutMs,
        });
        if (!adapter.reconcilePending) {
          items.push({
            paymentId: payment.id,
            gateway: payment.gateway,
            gatewayRef: payment.gateway_ref,
            result: 'skipped',
            reason: 'adapter_reconcile_not_supported',
          });
          continue;
        }
        const rec = await adapter.reconcilePending({
          gatewayRef: payment.gateway_ref,
          amount: Number(payment.amount || 0),
          currency: String(payment.currency || 'IRR'),
        });
        const applied = await applyPaymentResult(db, {
          gateway: payment.gateway,
          gatewayRef: payment.gateway_ref,
          result: rec.result,
          paidAt: rec.paidAt,
          raw: rec.raw,
          source: `reconcile:${payment.gateway}`,
        });
        await auditEvent(db, {
          actorUserId: adminUser.id,
          action: 'payment.reconcile',
          entityType: 'payment',
          entityId: payment.id,
          payload: { gateway: payment.gateway, gatewayRef: payment.gateway_ref, result: rec.result, raw: rec.raw },
          traceId,
        });
        items.push({
          paymentId: payment.id,
          gateway: payment.gateway,
          gatewayRef: payment.gateway_ref,
          result: rec.result,
          statusAfter: applied.payment.status,
        });
      } catch (e: any) {
        items.push({
          paymentId: payment.id,
          gateway: payment.gateway,
          gatewayRef: payment.gateway_ref,
          result: 'error',
          reason: String(e?.message || e),
        });
      }
    }

    const summary = items.reduce(
      (acc, x) => {
        acc.total += 1;
        if (x.result === 'succeeded') acc.succeeded += 1;
        else if (x.result === 'failed') acc.failed += 1;
        else if (x.result === 'pending') acc.pending += 1;
        else if (x.result === 'skipped') acc.skipped += 1;
        else acc.errors += 1;
        return acc;
      },
      { total: 0, succeeded: 0, failed: 0, pending: 0, skipped: 0, errors: 0 },
    );

    return { summary, items };
  });
}
