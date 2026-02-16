import type { FastifyInstance } from 'fastify';
import type { Db } from './db';
import { ApiError } from './http';

export function registerAdminRoutes(app: FastifyInstance, db: Db, opts: { adminApiKey: string }) {
  function requireAdmin(req: any) {
    if (!opts.adminApiKey) throw new ApiError('AUTH_FORBIDDEN', 'Admin API disabled', 403);
    const key = String(req.headers['x-admin-key'] || '');
    if (!key || key !== opts.adminApiKey) throw new ApiError('AUTH_FORBIDDEN', 'Forbidden', 403);
  }

  app.get('/api/v1/admin/payments', async (req: any) => {
    requireAdmin(req);
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
    requireAdmin(req);
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

  app.get('/api/v1/admin/audit', async (req: any) => {
    requireAdmin(req);
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

  // Reconcile pending payments: mark very old pending payments as FAILED (safe for mock).
  app.post('/api/v1/payments/reconcile', async (req: any) => {
    requireAdmin(req);
    const minutes = Math.max(5, Number(req.body?.olderThanMinutes || 60));
    const r = await db.pool.query(
      `UPDATE payments
          SET status='FAILED'
        WHERE status='PENDING' AND created_at < (now() - ($1::int || ' minutes')::interval)
      RETURNING id`,
      [minutes],
    );
    return { updated: r.rowCount || 0 };
  });
}
