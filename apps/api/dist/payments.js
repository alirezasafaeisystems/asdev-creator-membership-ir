"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockGatewayAdapter = createMockGatewayAdapter;
exports.getPlan = getPlan;
exports.ensureCreator = ensureCreator;
exports.createSubscriptionCheckout = createSubscriptionCheckout;
exports.attachGatewayRef = attachGatewayRef;
exports.applyPaymentResult = applyPaymentResult;
const http_1 = require("./http");
function createMockGatewayAdapter(baseUrl) {
    const normalized = baseUrl.replace(/\/+$/, '');
    return {
        id: 'mock',
        async createCheckout({ paymentId, callbackUrl }) {
            const gatewayRef = `mock_${paymentId}`;
            const redirectUrl = `${normalized}/api/v1/mock-gateway/pay?paymentId=${encodeURIComponent(paymentId)}&callback=${encodeURIComponent(callbackUrl)}`;
            return { gateway: 'mock', gatewayRef, redirectUrl };
        },
        async verifyCallback({ gatewayRef, query }) {
            const status = (query.status || '').toLowerCase();
            if (!gatewayRef.startsWith('mock_'))
                return { ok: false, raw: { reason: 'invalid_ref' } };
            if (status === 'ok' || status === 'paid')
                return { ok: true, paidAt: new Date().toISOString(), raw: query };
            return { ok: false, raw: query };
        },
    };
}
async function getPlan(db, planId) {
    const r = await db.pool.query(`SELECT * FROM plans WHERE id=$1 AND is_active=true`, [planId]);
    if (r.rowCount !== 1)
        throw new http_1.ApiError('PLAN_NOT_FOUND', 'Plan not found', 404);
    return r.rows[0];
}
async function ensureCreator(db, creatorId) {
    const r = await db.pool.query(`SELECT * FROM creators WHERE id=$1`, [creatorId]);
    if (r.rowCount !== 1)
        throw new http_1.ApiError('CREATOR_NOT_FOUND', 'Creator not found', 404);
    return r.rows[0];
}
async function createSubscriptionCheckout(db, input) {
    const plan = await getPlan(db, input.planId);
    const creator = await ensureCreator(db, plan.creator_id);
    if (input.idempotencyKey) {
        const existing = await db.pool.query(`SELECT p.id as payment_id, p.gateway, p.status, p.gateway_ref, s.id as subscription_id
         FROM payments p
         JOIN subscriptions s ON s.id = p.subscription_id
        WHERE p.idempotency_key = $1 AND p.user_id = $2`, [input.idempotencyKey, input.userId]);
        if (existing.rowCount === 1) {
            return existing.rows[0];
        }
    }
    const sub = await db.pool.query(`INSERT INTO subscriptions (user_id, creator_id, plan_id, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`, [input.userId, creator.id, plan.id, 'PENDING_PAYMENT']);
    const subscriptionId = sub.rows[0].id;
    const pay = await db.pool.query(`INSERT INTO payments (subscription_id, creator_id, user_id, amount, currency, gateway, status, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`, [
        subscriptionId,
        creator.id,
        input.userId,
        plan.price_amount,
        plan.currency,
        input.gateway,
        'PENDING',
        input.idempotencyKey ?? null,
    ]);
    return { subscription: sub.rows[0], payment: pay.rows[0], plan, creator };
}
async function attachGatewayRef(db, input) {
    try {
        const r = await db.pool.query(`UPDATE payments SET gateway_ref=$1 WHERE id=$2 AND gateway=$3 RETURNING *`, [input.gatewayRef, input.paymentId, input.gateway]);
        if (r.rowCount !== 1)
            throw new http_1.ApiError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
        return r.rows[0];
    }
    catch (e) {
        if (String(e?.code) === '23505') {
            throw new http_1.ApiError('PAYMENT_DUPLICATE_CALLBACK', 'Duplicate gateway reference', 409);
        }
        throw e;
    }
}
async function applyPaymentResult(db, input) {
    const r = await db.pool.query(`SELECT p.*, s.status as sub_status
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
      WHERE p.gateway=$1 AND p.gateway_ref=$2`, [input.gateway, input.gatewayRef]);
    if (r.rowCount !== 1)
        throw new http_1.ApiError('PAYMENT_CALLBACK_INVALID', 'Unknown payment reference', 400);
    const payment = r.rows[0];
    if (payment.status === 'SUCCEEDED') {
        return { payment, subscriptionUpdated: false };
    }
    if (!input.ok) {
        await db.pool.query(`UPDATE payments SET status='FAILED' WHERE id=$1`, [payment.id]);
        return { payment: { ...payment, status: 'FAILED' }, subscriptionUpdated: false };
    }
    await db.pool.query(`UPDATE payments SET status='SUCCEEDED', paid_at=$2 WHERE id=$1`, [payment.id, input.paidAt ? new Date(input.paidAt) : new Date()]);
    // Activate subscription idempotently.
    await db.pool.query(`UPDATE subscriptions
        SET status='ACTIVE',
            started_at = COALESCE(started_at, now()),
            current_period_end = COALESCE(current_period_end, now() + interval '30 days'),
            updated_at = now()
      WHERE id=$1 AND status IN ('PENDING_PAYMENT')`, [payment.subscription_id]);
    const updatedPayment = (await db.pool.query(`SELECT * FROM payments WHERE id=$1`, [payment.id])).rows[0];
    return { payment: updatedPayment, subscriptionUpdated: true };
}
