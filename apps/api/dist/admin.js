"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAdminRoutes = registerAdminRoutes;
const http_1 = require("./http");
function registerAdminRoutes(app, db, opts) {
    function requireAdmin(req) {
        if (!opts.adminApiKey)
            throw new http_1.ApiError('AUTH_FORBIDDEN', 'Admin API disabled', 403);
        const key = String(req.headers['x-admin-key'] || '');
        if (!key || key !== opts.adminApiKey)
            throw new http_1.ApiError('AUTH_FORBIDDEN', 'Forbidden', 403);
    }
    app.get('/api/v1/admin/payments', async (req) => {
        requireAdmin(req);
        const limit = Math.min(Number(req.query?.limit || 50), 200);
        const r = await db.pool.query(`SELECT p.*, s.status as subscription_status
         FROM payments p
         JOIN subscriptions s ON s.id=p.subscription_id
        ORDER BY p.created_at DESC
        LIMIT $1`, [limit]);
        return { items: r.rows };
    });
    app.get('/api/v1/admin/payments/:id', async (req) => {
        requireAdmin(req);
        const r = await db.pool.query(`SELECT p.*, s.status as subscription_status
         FROM payments p
         JOIN subscriptions s ON s.id=p.subscription_id
        WHERE p.id=$1`, [req.params.id]);
        if (r.rowCount !== 1)
            throw new http_1.ApiError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
        return r.rows[0];
    });
    app.get('/api/v1/admin/audit', async (req) => {
        requireAdmin(req);
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
    // Reconcile pending payments: mark very old pending payments as FAILED (safe for mock).
    app.post('/api/v1/payments/reconcile', async (req) => {
        requireAdmin(req);
        const minutes = Math.max(5, Number(req.body?.olderThanMinutes || 60));
        const r = await db.pool.query(`UPDATE payments
          SET status='FAILED'
        WHERE status='PENDING' AND created_at < (now() - ($1::int || ' minutes')::interval)
      RETURNING id`, [minutes]);
        return { updated: r.rowCount || 0 };
    });
}
