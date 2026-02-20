"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdminRoutes = registerAdminRoutes;
const http_1 = require("./http");
const payments_1 = require("./payments");
const audit_1 = require("./audit");
const auth_1 = require("./auth");
function registerAdminRoutes(app, db, opts) {
    function getAuthToken(req) {
        const h = String(req.headers.authorization || '');
        const m = h.match(/^Bearer\s+(.+)$/i);
        if (!m)
            return null;
        return m[1];
    }
    async function requireAdminRole(req, allowedRoles) {
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        if (!allowedRoles.includes(String(user.role))) {
            throw new http_1.ApiError('AUTH_FORBIDDEN', 'Forbidden', 403, {
                requiredRoles: allowedRoles,
                userRole: user.role,
            });
        }
        return user;
    }
    app.get('/api/v1/admin/payments', async (req) => {
        await requireAdminRole(req, ['platform_admin', 'support_admin', 'auditor']);
        const limit = Math.min(Number(req.query?.limit || 50), 200);
        const r = await db.pool.query(`SELECT p.*, s.status as subscription_status
         FROM payments p
         JOIN subscriptions s ON s.id=p.subscription_id
        ORDER BY p.created_at DESC
        LIMIT $1`, [limit]);
        return { items: r.rows };
    });
    app.get('/api/v1/admin/payments/:id', async (req) => {
        await requireAdminRole(req, ['platform_admin', 'support_admin', 'auditor']);
        const r = await db.pool.query(`SELECT p.*, s.status as subscription_status
         FROM payments p
         JOIN subscriptions s ON s.id=p.subscription_id
        WHERE p.id=$1`, [req.params.id]);
        if (r.rowCount !== 1)
            throw new http_1.ApiError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
        return r.rows[0];
    });
    app.get('/api/v1/admin/payments/:id/events', async (req) => {
        await requireAdminRole(req, ['platform_admin', 'support_admin', 'auditor']);
        const limit = Math.max(1, Math.min(200, Number(req.query?.limit || 100)));
        const r = await db.pool.query(`SELECT *
         FROM payment_events
        WHERE payment_id=$1
        ORDER BY created_at DESC
        LIMIT $2`, [req.params.id, limit]);
        return { items: r.rows };
    });
    app.get('/api/v1/admin/audit', async (req) => {
        await requireAdminRole(req, ['platform_admin', 'auditor']);
        const limit = Math.min(Number(req.query?.limit || 50), 200);
        const entityType = req.query?.entityType ? String(req.query.entityType) : null;
        const entityId = req.query?.entityId ? String(req.query.entityId) : null;
        const where = [];
        const params = [];
        if (entityType) {
            params.push(entityType);
            where.push(`entity_type=$${params.length}`);
        }
        if (entityId) {
            params.push(entityId);
            where.push(`entity_id::text=$${params.length}`);
        }
        params.push(limit);
        const sql = `SELECT * FROM audit_events ` +
            (where.length ? `WHERE ${where.join(' AND ')} ` : '') +
            `ORDER BY created_at DESC LIMIT $${params.length}`;
        const r = await db.pool.query(sql, params);
        return { items: r.rows };
    });
    app.get('/api/v1/admin/overview', async (req) => {
        await requireAdminRole(req, ['platform_admin', 'support_admin', 'auditor']);
        const [users, creators, plans, subscriptions, payments, audits] = await Promise.all([
            db.pool.query(`SELECT COUNT(*)::int AS c FROM users`),
            db.pool.query(`SELECT COUNT(*)::int AS c FROM creators`),
            db.pool.query(`SELECT COUNT(*)::int AS c FROM plans WHERE is_active=true`),
            db.pool.query(`SELECT status, COUNT(*)::int AS c
           FROM subscriptions
          GROUP BY status`),
            db.pool.query(`SELECT status, COUNT(*)::int AS c
           FROM payments
          GROUP BY status`),
            db.pool.query(`SELECT action, created_at
           FROM audit_events
          ORDER BY created_at DESC
          LIMIT 10`),
        ]);
        const subscriptionByStatus = {};
        for (const row of subscriptions.rows)
            subscriptionByStatus[String(row.status)] = Number(row.c || 0);
        const paymentByStatus = {};
        for (const row of payments.rows)
            paymentByStatus[String(row.status)] = Number(row.c || 0);
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
    // Reconcile pending payments through adapter and return structured report.
    app.post('/api/v1/payments/reconcile', async (req) => {
        const adminUser = await requireAdminRole(req, ['platform_admin', 'support_admin']);
        const traceId = String(req.traceId || '');
        const minutes = Math.max(5, Number(req.body?.olderThanMinutes || 60));
        const limit = Math.max(1, Math.min(500, Number(req.body?.limit || 100)));
        const pending = await db.pool.query(`SELECT *
         FROM payments
        WHERE status='PENDING'
          AND created_at < (now() - ($1::int || ' minutes')::interval)
        ORDER BY created_at ASC
        LIMIT $2`, [minutes, limit]);
        const items = [];
        for (const payment of pending.rows) {
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
                const adapter = (0, payments_1.createPaymentGatewayAdapter)({
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
                const applied = await (0, payments_1.applyPaymentResult)(db, {
                    gateway: payment.gateway,
                    gatewayRef: payment.gateway_ref,
                    result: rec.result,
                    paidAt: rec.paidAt,
                    raw: rec.raw,
                    source: `reconcile:${payment.gateway}`,
                });
                await (0, audit_1.auditEvent)(db, {
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
            }
            catch (e) {
                items.push({
                    paymentId: payment.id,
                    gateway: payment.gateway,
                    gatewayRef: payment.gateway_ref,
                    result: 'error',
                    reason: String(e?.message || e),
                });
            }
        }
        const summary = items.reduce((acc, x) => {
            acc.total += 1;
            if (x.result === 'succeeded')
                acc.succeeded += 1;
            else if (x.result === 'failed')
                acc.failed += 1;
            else if (x.result === 'pending')
                acc.pending += 1;
            else if (x.result === 'skipped')
                acc.skipped += 1;
            else
                acc.errors += 1;
            return acc;
        }, { total: 0, succeeded: 0, failed: 0, pending: 0, skipped: 0, errors: 0 });
        return { summary, items };
    });
}
