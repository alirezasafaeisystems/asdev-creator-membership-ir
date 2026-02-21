"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockGatewayAdapter = createMockGatewayAdapter;
exports.createIdpayAdapter = createIdpayAdapter;
exports.createPaymentGatewayAdapter = createPaymentGatewayAdapter;
exports.getPlan = getPlan;
exports.ensureCreator = ensureCreator;
exports.createSubscriptionCheckout = createSubscriptionCheckout;
exports.attachGatewayRef = attachGatewayRef;
exports.applyPaymentResult = applyPaymentResult;
exports.recordPaymentEvent = recordPaymentEvent;
const http_1 = require("./http");
const security_1 = require("./security");
function createMockGatewayAdapter(baseUrl) {
    const normalized = baseUrl.replace(/\/+$/, '');
    return {
        id: 'mock',
        kind: 'mock',
        async createCheckout({ paymentId, callbackUrl }) {
            const gatewayRef = `mock_${paymentId}`;
            const redirectUrl = `${normalized}/api/v1/mock-gateway/pay?paymentId=${encodeURIComponent(paymentId)}&callback=${encodeURIComponent(callbackUrl)}`;
            return { gateway: 'mock', gatewayRef, redirectUrl };
        },
        async verifyCallback({ gatewayRef, payload }) {
            const status = (payload.status || '').toLowerCase();
            if (!gatewayRef.startsWith('mock_'))
                return { result: 'failed', raw: { reason: 'invalid_ref' } };
            if (status === 'pending')
                return { result: 'pending', raw: payload };
            if (status === 'ok' || status === 'paid')
                return { result: 'succeeded', paidAt: new Date().toISOString(), raw: payload };
            return { result: 'failed', raw: payload };
        },
        async reconcilePending({ gatewayRef }) {
            if (!gatewayRef.startsWith('mock_'))
                return { result: 'failed', raw: { reason: 'invalid_ref' } };
            return { result: 'pending', raw: { source: 'mock.reconcile' } };
        },
    };
}
function createIdpayAdapter(opts) {
    const normalized = opts.baseUrl.replace(/\/+$/, '');
    return {
        id: 'idpay',
        kind: 'provider',
        async createCheckout({ paymentId, callbackUrl }) {
            if (!normalized)
                throw new http_1.ApiError('PAYMENT_PROVIDER_TIMEOUT', 'Payment provider base URL is missing', 503);
            const gatewayRef = `idpay_${paymentId}`;
            const redirectUrl = `${normalized}/pay/${encodeURIComponent(paymentId)}?callback=${encodeURIComponent(callbackUrl)}`;
            return { gateway: 'idpay', gatewayRef, redirectUrl };
        },
        async verifyCallback({ gatewayRef, payload, headers }) {
            const status = String(payload.status || '').toLowerCase();
            const signatureHeader = String(headers?.['x-gateway-signature'] || payload.signature || '');
            const signed = `${gatewayRef}:${status}`;
            const expected = (0, security_1.hmacSha256Base64Url)(opts.webhookSecret, signed);
            if (!signatureHeader || signatureHeader !== expected) {
                throw new http_1.ApiError('PAYMENT_WEBHOOK_SIGNATURE_INVALID', 'Invalid payment callback signature', 401);
            }
            if (status === 'pending')
                return { result: 'pending', raw: payload };
            if (status === 'ok' || status === 'paid' || status === 'succeeded') {
                return { result: 'succeeded', paidAt: new Date().toISOString(), raw: payload };
            }
            return { result: 'failed', raw: payload };
        },
        async reconcilePending({ gatewayRef }) {
            // Local-first deterministic reconciliation:
            // do not randomly mutate payment state without provider evidence.
            return {
                result: 'pending',
                raw: { source: 'idpay.reconcile', mode: 'local', reason: 'no_provider_polling_evidence', gatewayRef },
            };
        },
    };
}
function createPaymentGatewayAdapter(input) {
    if (input.gatewayId === 'mock')
        return createMockGatewayAdapter(input.baseUrl);
    if (input.gatewayId === 'idpay') {
        if (!input.webhookSecret)
            throw new http_1.ApiError('PAYMENT_PROVIDER_TIMEOUT', 'PAYMENT_GATEWAY_WEBHOOK_SECRET is required', 503);
        return createIdpayAdapter({
            baseUrl: input.baseUrl,
            webhookSecret: input.webhookSecret,
            timeoutMs: Math.max(500, Number(input.timeoutMs || 5000)),
        });
    }
    throw new http_1.ApiError('PAYMENT_PROVIDER_TIMEOUT', 'Gateway not configured', 501);
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
    const r = await db.pool.query(`SELECT p.*, s.status as sub_status, plan.price_amount AS expected_amount, plan.currency AS expected_currency
       FROM payments p
       JOIN subscriptions s ON s.id = p.subscription_id
       JOIN plans plan ON plan.id = s.plan_id
      WHERE p.gateway=$1 AND p.gateway_ref=$2`, [input.gateway, input.gatewayRef]);
    if (r.rowCount !== 1)
        throw new http_1.ApiError('PAYMENT_CALLBACK_INVALID', 'Unknown payment reference', 400);
    const payment = r.rows[0];
    if (payment.status === 'SUCCEEDED') {
        await recordPaymentEvent(db, {
            paymentId: payment.id,
            gateway: input.gateway,
            gatewayRef: input.gatewayRef,
            source: input.source || 'unknown',
            result: 'succeeded',
            raw: { reason: 'already_succeeded', inputResult: input.result, raw: input.raw },
        });
        return { payment, subscriptionUpdated: false };
    }
    if (input.result === 'pending') {
        await recordPaymentEvent(db, {
            paymentId: payment.id,
            gateway: input.gateway,
            gatewayRef: input.gatewayRef,
            source: input.source || 'unknown',
            result: 'pending',
            raw: input.raw,
        });
        return { payment, subscriptionUpdated: false };
    }
    if (input.result === 'failed') {
        await db.pool.query(`UPDATE payments SET status='FAILED' WHERE id=$1`, [payment.id]);
        await recordPaymentEvent(db, {
            paymentId: payment.id,
            gateway: input.gateway,
            gatewayRef: input.gatewayRef,
            source: input.source || 'unknown',
            result: 'failed',
            raw: input.raw,
        });
        return { payment: { ...payment, status: 'FAILED' }, subscriptionUpdated: false };
    }
    const expectedAmount = Number(payment.expected_amount || 0);
    const expectedCurrency = String(payment.expected_currency || payment.currency || 'IRR');
    const actualAmount = Number(payment.amount || 0);
    const actualCurrency = String(payment.currency || 'IRR');
    if (actualAmount !== expectedAmount || actualCurrency !== expectedCurrency) {
        await db.pool.query(`UPDATE payments SET status='FAILED' WHERE id=$1`, [payment.id]);
        await recordPaymentEvent(db, {
            paymentId: payment.id,
            gateway: input.gateway,
            gatewayRef: input.gatewayRef,
            source: input.source || 'unknown',
            result: 'failed',
            raw: {
                reason: 'amount_mismatch',
                expectedAmount,
                actualAmount,
                expectedCurrency,
                actualCurrency,
                raw: input.raw,
            },
        });
        return { payment: { ...payment, status: 'FAILED' }, subscriptionUpdated: false };
    }
    if (!['PENDING_PAYMENT', 'ACTIVE'].includes(String(payment.sub_status))) {
        await recordPaymentEvent(db, {
            paymentId: payment.id,
            gateway: input.gateway,
            gatewayRef: input.gatewayRef,
            source: input.source || 'unknown',
            result: 'failed',
            raw: { reason: 'subscription_status_inconsistent', currentSubscriptionStatus: payment.sub_status, raw: input.raw },
        });
        return { payment, subscriptionUpdated: false };
    }
    await db.pool.query(`UPDATE payments SET status='SUCCEEDED', paid_at=$2 WHERE id=$1`, [payment.id, input.paidAt ? new Date(input.paidAt) : new Date()]);
    await recordPaymentEvent(db, {
        paymentId: payment.id,
        gateway: input.gateway,
        gatewayRef: input.gatewayRef,
        source: input.source || 'unknown',
        result: 'succeeded',
        raw: input.raw,
    });
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
async function recordPaymentEvent(db, input) {
    await db.pool.query(`INSERT INTO payment_events (payment_id, gateway, gateway_ref, source, result, raw)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb)`, [input.paymentId, input.gateway, input.gatewayRef, input.source, input.result, JSON.stringify(input.raw ?? {})]);
}
