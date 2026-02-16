import type { FastifyInstance } from 'fastify';
import type { Db } from './db';
import { ApiError } from './http';
import { auditEvent } from './audit';
import { createSession, getUserBySession, signIn, signUp } from './auth';
import {
  attachGatewayRef,
  createMockGatewayAdapter,
  createSubscriptionCheckout,
  applyPaymentResult,
} from './payments';

function getAuthToken(req: any): string | null {
  const h = String(req.headers.authorization || '');
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return m[1];
}

export function registerPublicRoutes(app: FastifyInstance, db: Db, opts: { publicBaseUrl: string; paymentGateway: string }) {
  app.post('/api/v1/auth/signup', async (req: any) => {
    const traceId = String(req.traceId || '');
    const body = req.body || {};
    if (!body.email || !body.password) throw new ApiError('AUTH_INVALID_REQUEST', 'email/password required', 400);
    const user = await signUp(db, { email: body.email, password: body.password, name: body.name });
    const session = await createSession(db, user.id);
    await auditEvent(db, { actorUserId: user.id, action: 'auth.signup', entityType: 'user', entityId: user.id, payload: { email: user.email }, traceId });
    return { user, session };
  });

  app.post('/api/v1/auth/signin', async (req: any) => {
    const traceId = String(req.traceId || '');
    const body = req.body || {};
    if (!body.email || !body.password) throw new ApiError('AUTH_INVALID_REQUEST', 'email/password required', 400);
    const user = await signIn(db, { email: body.email, password: body.password });
    const session = await createSession(db, user.id);
    await auditEvent(db, { actorUserId: user.id, action: 'auth.signin', entityType: 'user', entityId: user.id, payload: {}, traceId });
    return { user, session };
  });

  app.get('/api/v1/me', async (req: any) => {
    const token = getAuthToken(req);
    if (!token) throw new ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
    const user = await getUserBySession(db, token);
    if (!user) throw new ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
    return { user };
  });

  app.post('/api/v1/creators', async (req: any) => {
    const traceId = String(req.traceId || '');
    const token = getAuthToken(req);
    if (!token) throw new ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
    const user = await getUserBySession(db, token);
    if (!user) throw new ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);

    const body = req.body || {};
    if (!body.slug || !body.displayName) throw new ApiError('CREATOR_INVALID_REQUEST', 'slug/displayName required', 400);
    try {
      const r = await db.pool.query(
        `INSERT INTO creators (user_id, slug, display_name, bio, social_links)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING *`,
        [user.id, String(body.slug), String(body.displayName), String(body.bio || ''), JSON.stringify(body.socialLinks || {})],
      );
      await auditEvent(db, { actorUserId: user.id, action: 'creator.create', entityType: 'creator', entityId: r.rows[0].id, payload: { slug: body.slug }, traceId });
      return r.rows[0];
    } catch (e: any) {
      if (String(e?.code) === '23505') throw new ApiError('CREATOR_SLUG_EXISTS', 'Slug already exists', 409);
      throw e;
    }
  });

  app.post('/api/v1/creators/:creatorId/plans', async (req: any) => {
    const traceId = String(req.traceId || '');
    const token = getAuthToken(req);
    if (!token) throw new ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
    const user = await getUserBySession(db, token);
    if (!user) throw new ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);

    const creatorId = String(req.params.creatorId);
    const creator = await db.pool.query(`SELECT * FROM creators WHERE id=$1`, [creatorId]);
    if (creator.rowCount !== 1) throw new ApiError('CREATOR_NOT_FOUND', 'Creator not found', 404);
    if (creator.rows[0].user_id !== user.id) throw new ApiError('AUTH_FORBIDDEN', 'Forbidden', 403);

    const body = req.body || {};
    if (!body.title || !body.priceAmount) throw new ApiError('PLAN_INVALID_REQUEST', 'title/priceAmount required', 400);
    const r = await db.pool.query(
      `INSERT INTO plans (creator_id, title, description, price_amount, currency, interval, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [
        creatorId,
        String(body.title),
        String(body.description || ''),
        Number(body.priceAmount),
        String(body.currency || 'IRR'),
        String(body.interval || 'month'),
      ],
    );
    await auditEvent(db, { actorUserId: user.id, action: 'plan.create', entityType: 'plan', entityId: r.rows[0].id, payload: { creatorId }, traceId });
    return r.rows[0];
  });

  app.post('/api/v1/subscriptions/checkout', async (req: any) => {
    const traceId = String(req.traceId || '');
    const token = getAuthToken(req);
    if (!token) throw new ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
    const user = await getUserBySession(db, token);
    if (!user) throw new ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);

    const body = req.body || {};
    const planId = String(body.planId || '');
    if (!planId) throw new ApiError('SUBSCRIPTION_INVALID_REQUEST', 'planId required', 400);
    const idempotencyKey = req.headers['idempotency-key'] ? String(req.headers['idempotency-key']) : null;

    const created = await createSubscriptionCheckout(db, {
      userId: user.id,
      planId,
      gateway: opts.paymentGateway,
      idempotencyKey,
    });

    await auditEvent(db, {
      actorUserId: user.id,
      action: 'subscription.checkout',
      entityType: 'subscription',
      entityId: created.subscription.id,
      payload: { planId, gateway: opts.paymentGateway },
      traceId,
    });

    const gateway = createMockGatewayAdapter(opts.publicBaseUrl);
    const callbackUrl = `${opts.publicBaseUrl}/api/v1/payments/${gateway.id}/callback`;
    const checkout = await gateway.createCheckout({
      paymentId: created.payment.id,
      amount: created.payment.amount,
      currency: created.payment.currency,
      callbackUrl,
    });

    const payment = await attachGatewayRef(db, {
      paymentId: created.payment.id,
      gateway: checkout.gateway,
      gatewayRef: checkout.gatewayRef,
    });

    return {
      subscriptionId: created.subscription.id,
      paymentId: payment.id,
      gateway: checkout.gateway,
      redirectUrl: checkout.redirectUrl,
    };
  });

  app.get('/api/v1/subscriptions/me', async (req: any) => {
    const token = getAuthToken(req);
    if (!token) throw new ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
    const user = await getUserBySession(db, token);
    if (!user) throw new ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
    const r = await db.pool.query(
      `SELECT s.*, p.title as plan_title, c.slug as creator_slug, c.display_name as creator_display_name
         FROM subscriptions s
         JOIN plans p ON p.id=s.plan_id
         JOIN creators c ON c.id=s.creator_id
        WHERE s.user_id=$1
        ORDER BY s.created_at DESC
        LIMIT 100`,
      [user.id],
    );
    return { items: r.rows };
  });

  app.get('/api/v1/payments/me', async (req: any) => {
    const token = getAuthToken(req);
    if (!token) throw new ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
    const user = await getUserBySession(db, token);
    if (!user) throw new ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
    const r = await db.pool.query(
      `SELECT p.*
         FROM payments p
        WHERE p.user_id=$1
        ORDER BY p.created_at DESC
        LIMIT 100`,
      [user.id],
    );
    return { items: r.rows };
  });

  // Mock gateway simulation: marks as paid and redirects to callback.
  app.get('/api/v1/mock-gateway/pay', async (req: any, reply: any) => {
    const paymentId = String(req.query?.paymentId || '');
    const callback = String(req.query?.callback || '');
    if (!paymentId || !callback) throw new ApiError('PAYMENT_CALLBACK_INVALID', 'Invalid mock gateway request', 400);
    const url = new URL(callback);
    url.searchParams.set('gateway_ref', `mock_${paymentId}`);
    url.searchParams.set('status', 'ok');
    reply.redirect(url.toString());
  });

  // Callback handler (GET for mock, POST for real gateways later).
  app.get('/api/v1/payments/:gateway/callback', async (req: any) => {
    const traceId = String(req.traceId || '');
    const gatewayId = String(req.params.gateway || '');
    if (gatewayId !== 'mock') throw new ApiError('PAYMENT_PROVIDER_TIMEOUT', 'Gateway not configured', 501);
    const adapter = createMockGatewayAdapter(opts.publicBaseUrl);

    const gatewayRef = String(req.query?.gateway_ref || '');
    if (!gatewayRef) throw new ApiError('PAYMENT_CALLBACK_INVALID', 'Missing gateway_ref', 400);

    const verified = await adapter.verifyCallback({ gatewayRef, query: req.query || {} });
    const applied = await applyPaymentResult(db, { gateway: 'mock', gatewayRef, ok: verified.ok, paidAt: verified.paidAt, raw: verified.raw });
    await auditEvent(db, {
      actorUserId: applied.payment.user_id,
      action: verified.ok ? 'payment.succeeded' : 'payment.failed',
      entityType: 'payment',
      entityId: applied.payment.id,
      payload: { gateway: 'mock', gatewayRef },
      traceId,
    });
    return { ok: verified.ok, paymentId: applied.payment.id, status: applied.payment.status };
  });

  app.post('/api/v1/payments/:gateway/callback', async (req: any) => {
    const traceId = String(req.traceId || '');
    const gatewayId = String(req.params.gateway || '');
    if (gatewayId !== 'mock') throw new ApiError('PAYMENT_PROVIDER_TIMEOUT', 'Gateway not configured', 501);
    const adapter = createMockGatewayAdapter(opts.publicBaseUrl);

    const body = req.body || {};
    const gatewayRef = String(body.gateway_ref || body.gatewayRef || '');
    if (!gatewayRef) throw new ApiError('PAYMENT_CALLBACK_INVALID', 'Missing gateway_ref', 400);

    const verified = await adapter.verifyCallback({ gatewayRef, query: body || {} });
    const applied = await applyPaymentResult(db, { gateway: 'mock', gatewayRef, ok: verified.ok, paidAt: verified.paidAt, raw: verified.raw });
    await auditEvent(db, {
      actorUserId: applied.payment.user_id,
      action: verified.ok ? 'payment.succeeded' : 'payment.failed',
      entityType: 'payment',
      entityId: applied.payment.id,
      payload: { gateway: 'mock', gatewayRef },
      traceId,
    });
    return { ok: verified.ok, paymentId: applied.payment.id, status: applied.payment.status };
  });
}
