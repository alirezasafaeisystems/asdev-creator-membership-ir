import type { Db } from './db';
import { ApiError } from './http';

export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';
export type SubscriptionStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELED' | 'EXPIRED';

export type GatewayCheckoutResult = {
  gateway: string;
  gatewayRef: string;
  redirectUrl: string;
};

export type PaymentGatewayAdapter = {
  id: string;
  createCheckout: (input: {
    paymentId: string;
    amount: number;
    currency: string;
    callbackUrl: string;
  }) => Promise<GatewayCheckoutResult>;

  verifyCallback: (input: {
    gatewayRef: string;
    query: Record<string, string | undefined>;
  }) => Promise<{ ok: boolean; paidAt?: string; raw?: unknown }>;
};

export function createMockGatewayAdapter(baseUrl: string): PaymentGatewayAdapter {
  const normalized = baseUrl.replace(/\/+$/, '');
  return {
    id: 'mock',
    async createCheckout({ paymentId, callbackUrl }) {
      const gatewayRef = `mock_${paymentId}`;
      const redirectUrl = `${normalized}/api/v1/mock-gateway/pay?paymentId=${encodeURIComponent(
        paymentId,
      )}&callback=${encodeURIComponent(callbackUrl)}`;
      return { gateway: 'mock', gatewayRef, redirectUrl };
    },
    async verifyCallback({ gatewayRef, query }) {
      const status = (query.status || '').toLowerCase();
      if (!gatewayRef.startsWith('mock_')) return { ok: false, raw: { reason: 'invalid_ref' } };
      if (status === 'ok' || status === 'paid') return { ok: true, paidAt: new Date().toISOString(), raw: query };
      return { ok: false, raw: query };
    },
  };
}

export async function getPlan(db: Db, planId: string) {
  const r = await db.pool.query(`SELECT * FROM plans WHERE id=$1 AND is_active=true`, [planId]);
  if (r.rowCount !== 1) throw new ApiError('PLAN_NOT_FOUND', 'Plan not found', 404);
  return r.rows[0] as any;
}

export async function ensureCreator(db: Db, creatorId: string) {
  const r = await db.pool.query(`SELECT * FROM creators WHERE id=$1`, [creatorId]);
  if (r.rowCount !== 1) throw new ApiError('CREATOR_NOT_FOUND', 'Creator not found', 404);
  return r.rows[0] as any;
}

export async function createSubscriptionCheckout(db: Db, input: {
  userId: string;
  planId: string;
  gateway: string;
  idempotencyKey?: string | null;
}) {
  const plan = await getPlan(db, input.planId);
  const creator = await ensureCreator(db, plan.creator_id);

  if (input.idempotencyKey) {
    const existing = await db.pool.query(
      `SELECT p.id as payment_id, p.gateway, p.status, p.gateway_ref, s.id as subscription_id
         FROM payments p
         JOIN subscriptions s ON s.id = p.subscription_id
        WHERE p.idempotency_key = $1 AND p.user_id = $2`,
      [input.idempotencyKey, input.userId],
    );
    if (existing.rowCount === 1) {
      return existing.rows[0] as any;
    }
  }

  const sub = await db.pool.query(
    `INSERT INTO subscriptions (user_id, creator_id, plan_id, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [input.userId, creator.id, plan.id, 'PENDING_PAYMENT'],
  );
  const subscriptionId = sub.rows[0].id as string;

  const pay = await db.pool.query(
    `INSERT INTO payments (subscription_id, creator_id, user_id, amount, currency, gateway, status, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      subscriptionId,
      creator.id,
      input.userId,
      plan.price_amount,
      plan.currency,
      input.gateway,
      'PENDING',
      input.idempotencyKey ?? null,
    ],
  );

  return { subscription: sub.rows[0], payment: pay.rows[0], plan, creator };
}

export async function attachGatewayRef(db: Db, input: { paymentId: string; gateway: string; gatewayRef: string }) {
  try {
    const r = await db.pool.query(
      `UPDATE payments SET gateway_ref=$1 WHERE id=$2 AND gateway=$3 RETURNING *`,
      [input.gatewayRef, input.paymentId, input.gateway],
    );
    if (r.rowCount !== 1) throw new ApiError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
    return r.rows[0] as any;
  } catch (e: any) {
    if (String(e?.code) === '23505') {
      throw new ApiError('PAYMENT_DUPLICATE_CALLBACK', 'Duplicate gateway reference', 409);
    }
    throw e;
  }
}

export async function applyPaymentResult(db: Db, input: {
  gateway: string;
  gatewayRef: string;
  ok: boolean;
  paidAt?: string;
  raw?: unknown;
}) {
  const r = await db.pool.query(
    `SELECT p.*, s.status as sub_status
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
      WHERE p.gateway=$1 AND p.gateway_ref=$2`,
    [input.gateway, input.gatewayRef],
  );
  if (r.rowCount !== 1) throw new ApiError('PAYMENT_CALLBACK_INVALID', 'Unknown payment reference', 400);
  const payment = r.rows[0] as any;
  if (payment.status === 'SUCCEEDED') {
    return { payment, subscriptionUpdated: false };
  }

  if (!input.ok) {
    await db.pool.query(`UPDATE payments SET status='FAILED' WHERE id=$1`, [payment.id]);
    return { payment: { ...payment, status: 'FAILED' }, subscriptionUpdated: false };
  }

  await db.pool.query(
    `UPDATE payments SET status='SUCCEEDED', paid_at=$2 WHERE id=$1`,
    [payment.id, input.paidAt ? new Date(input.paidAt) : new Date()],
  );

  // Activate subscription idempotently.
  await db.pool.query(
    `UPDATE subscriptions
        SET status='ACTIVE',
            started_at = COALESCE(started_at, now()),
            current_period_end = COALESCE(current_period_end, now() + interval '30 days'),
            updated_at = now()
      WHERE id=$1 AND status IN ('PENDING_PAYMENT')`,
    [payment.subscription_id],
  );

  const updatedPayment = (await db.pool.query(`SELECT * FROM payments WHERE id=$1`, [payment.id])).rows[0];
  return { payment: updatedPayment, subscriptionUpdated: true };
}

