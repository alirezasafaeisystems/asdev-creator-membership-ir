"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPublicRoutes = registerPublicRoutes;
const http_1 = require("./http");
const audit_1 = require("./audit");
const auth_1 = require("./auth");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const payments_1 = require("./payments");
const security_1 = require("./security");
function getAuthToken(req) {
    const h = String(req.headers.authorization || '');
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m)
        return null;
    return m[1];
}
function normalizePayload(input) {
    if (!input || typeof input !== 'object')
        return {};
    const out = {};
    for (const [k, v] of Object.entries(input))
        out[k] = v == null ? undefined : String(v);
    return out;
}
function normalizeHeaders(input) {
    const out = {};
    if (!input || typeof input !== 'object')
        return out;
    for (const [k, v] of Object.entries(input)) {
        if (Array.isArray(v))
            out[String(k).toLowerCase()] = v.length ? String(v[0]) : undefined;
        else
            out[String(k).toLowerCase()] = v == null ? undefined : String(v);
    }
    return out;
}
function stablePairs(input) {
    return Object.entries(input)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v || ''}`)
        .join('&');
}
function b64urlEncode(value) {
    return Buffer.from(value, 'utf8').toString('base64url');
}
function b64urlDecode(value) {
    return Buffer.from(value, 'base64url').toString('utf8');
}
function createDownloadToken(secret, payload) {
    const body = b64urlEncode(JSON.stringify(payload));
    const sig = (0, security_1.hmacSha256Base64Url)(secret, body);
    return `${body}.${sig}`;
}
function verifyDownloadToken(secret, token) {
    const parts = token.split('.');
    if (parts.length !== 2)
        throw new http_1.ApiError('CONTENT_FORBIDDEN', 'Invalid download token', 403);
    const [body, sig] = parts;
    const expected = (0, security_1.hmacSha256Base64Url)(secret, body);
    if (sig !== expected)
        throw new http_1.ApiError('CONTENT_FORBIDDEN', 'Invalid download token', 403);
    const parsed = JSON.parse(b64urlDecode(body));
    if (!parsed?.contentId || !parsed?.userId || !parsed?.exp)
        throw new http_1.ApiError('CONTENT_FORBIDDEN', 'Invalid download token', 403);
    if (Number(parsed.exp) < Math.floor(Date.now() / 1000))
        throw new http_1.ApiError('CONTENT_FORBIDDEN', 'Download token expired', 403);
    return { contentId: String(parsed.contentId), userId: String(parsed.userId), exp: Number(parsed.exp) };
}
function resolveStoragePath(root, storagePath) {
    const normalizedRoot = path_1.default.resolve(root);
    const absolute = path_1.default.resolve(normalizedRoot, storagePath.replace(/^\/+/, ''));
    if (!absolute.startsWith(normalizedRoot)) {
        throw new http_1.ApiError('CONTENT_FORBIDDEN', 'Invalid storage path', 403);
    }
    return absolute;
}
function registerPublicRoutes(app, db, opts) {
    app.get('/api/v1/health/db', async () => {
        try {
            await db.pool.query('SELECT 1');
            return { ok: true, db: 'up' };
        }
        catch {
            throw new http_1.ApiError('DB_UNAVAILABLE', 'Database is unavailable', 503);
        }
    });
    app.post('/api/v1/auth/signup', async (req) => {
        const traceId = String(req.traceId || '');
        const body = req.body || {};
        if (!body.email || !body.password)
            throw new http_1.ApiError('AUTH_INVALID_REQUEST', 'email/password required', 400);
        const user = await (0, auth_1.signUp)(db, { email: body.email, password: body.password, name: body.name });
        const session = await (0, auth_1.createSession)(db, user.id);
        await (0, audit_1.auditEvent)(db, { actorUserId: user.id, action: 'auth.signup', entityType: 'user', entityId: user.id, payload: { email: user.email }, traceId });
        return { user, session };
    });
    app.post('/api/v1/auth/signin', async (req) => {
        const traceId = String(req.traceId || '');
        const body = req.body || {};
        if (!body.email || !body.password)
            throw new http_1.ApiError('AUTH_INVALID_REQUEST', 'email/password required', 400);
        const user = await (0, auth_1.signIn)(db, { email: body.email, password: body.password });
        const session = await (0, auth_1.createSession)(db, user.id);
        await (0, audit_1.auditEvent)(db, { actorUserId: user.id, action: 'auth.signin', entityType: 'user', entityId: user.id, payload: {}, traceId });
        return { user, session };
    });
    app.post('/api/v1/auth/refresh', async (req) => {
        const traceId = String(req.traceId || '');
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const rotated = await (0, auth_1.rotateSession)(db, token);
        const user = await (0, auth_1.getUserById)(db, rotated.userId);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        await (0, audit_1.auditEvent)(db, { actorUserId: user.id, action: 'auth.refresh', entityType: 'user', entityId: user.id, payload: {}, traceId });
        return { user, session: rotated.session };
    });
    app.post('/api/v1/auth/signout', async (req) => {
        const traceId = String(req.traceId || '');
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const removed = await (0, auth_1.revokeSession)(db, token);
        await (0, audit_1.auditEvent)(db, { actorUserId: user.id, action: 'auth.signout', entityType: 'user', entityId: user.id, payload: { removed }, traceId });
        return { ok: true, removed };
    });
    app.post('/api/v1/auth/signout-all', async (req) => {
        const traceId = String(req.traceId || '');
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const removed = await (0, auth_1.revokeAllSessions)(db, user.id);
        await (0, audit_1.auditEvent)(db, { actorUserId: user.id, action: 'auth.signout_all', entityType: 'user', entityId: user.id, payload: { removed }, traceId });
        return { ok: true, removed };
    });
    app.get('/api/v1/me', async (req) => {
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        return { user };
    });
    app.get('/api/v1/creators', async (req) => {
        const q = String(req.query?.q || '').trim().toLowerCase();
        const limit = Math.max(1, Math.min(50, Number(req.query?.limit || 20)));
        const params = [];
        let where = '';
        if (q) {
            params.push(`%${q}%`);
            where = `WHERE lower(c.slug) LIKE $${params.length} OR lower(c.display_name) LIKE $${params.length}`;
        }
        params.push(limit);
        const r = await db.pool.query(`SELECT c.id, c.slug, c.display_name, c.bio, c.created_at,
              COUNT(p.id) FILTER (WHERE p.is_active=true) AS active_plan_count
         FROM creators c
         LEFT JOIN plans p ON p.creator_id=c.id
         ${where}
        GROUP BY c.id
        ORDER BY c.created_at DESC
        LIMIT $${params.length}`, params);
        return { items: r.rows };
    });
    app.get('/api/v1/creators/:slug', async (req) => {
        const slug = String(req.params.slug || '');
        const r = await db.pool.query(`SELECT c.id, c.slug, c.display_name, c.bio, c.social_links, c.created_at
         FROM creators c
        WHERE c.slug=$1`, [slug]);
        if (r.rowCount !== 1)
            throw new http_1.ApiError('CREATOR_NOT_FOUND', 'Creator not found', 404);
        return r.rows[0];
    });
    app.get('/api/v1/creators/:slug/plans', async (req) => {
        const slug = String(req.params.slug || '');
        const creator = await db.pool.query(`SELECT id FROM creators WHERE slug=$1`, [slug]);
        if (creator.rowCount !== 1)
            throw new http_1.ApiError('CREATOR_NOT_FOUND', 'Creator not found', 404);
        const r = await db.pool.query(`SELECT id, creator_id, title, description, price_amount, currency, interval, is_active, created_at
         FROM plans
        WHERE creator_id=$1 AND is_active=true
        ORDER BY created_at DESC`, [creator.rows[0].id]);
        return { items: r.rows };
    });
    app.post('/api/v1/creators', async (req) => {
        const traceId = String(req.traceId || '');
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const body = req.body || {};
        if (!body.slug || !body.displayName)
            throw new http_1.ApiError('CREATOR_INVALID_REQUEST', 'slug/displayName required', 400);
        try {
            const r = await db.pool.query(`INSERT INTO creators (user_id, slug, display_name, bio, social_links)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING *`, [user.id, String(body.slug), String(body.displayName), String(body.bio || ''), JSON.stringify(body.socialLinks || {})]);
            await (0, audit_1.auditEvent)(db, { actorUserId: user.id, action: 'creator.create', entityType: 'creator', entityId: r.rows[0].id, payload: { slug: body.slug }, traceId });
            return r.rows[0];
        }
        catch (e) {
            if (String(e?.code) === '23505')
                throw new http_1.ApiError('CREATOR_SLUG_EXISTS', 'Slug already exists', 409);
            throw e;
        }
    });
    app.post('/api/v1/creators/:creatorId/plans', async (req) => {
        const traceId = String(req.traceId || '');
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const creatorId = String(req.params.creatorId);
        const creator = await db.pool.query(`SELECT * FROM creators WHERE id=$1`, [creatorId]);
        if (creator.rowCount !== 1)
            throw new http_1.ApiError('CREATOR_NOT_FOUND', 'Creator not found', 404);
        if (creator.rows[0].user_id !== user.id)
            throw new http_1.ApiError('AUTH_FORBIDDEN', 'Forbidden', 403);
        const body = req.body || {};
        if (!body.title || !body.priceAmount)
            throw new http_1.ApiError('PLAN_INVALID_REQUEST', 'title/priceAmount required', 400);
        const r = await db.pool.query(`INSERT INTO plans (creator_id, title, description, price_amount, currency, interval, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`, [
            creatorId,
            String(body.title),
            String(body.description || ''),
            Number(body.priceAmount),
            String(body.currency || 'IRR'),
            String(body.interval || 'month'),
        ]);
        await (0, audit_1.auditEvent)(db, { actorUserId: user.id, action: 'plan.create', entityType: 'plan', entityId: r.rows[0].id, payload: { creatorId }, traceId });
        return r.rows[0];
    });
    app.post('/api/v1/subscriptions/checkout', async (req) => {
        const traceId = String(req.traceId || '');
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const body = req.body || {};
        const planId = String(body.planId || '');
        if (!planId)
            throw new http_1.ApiError('SUBSCRIPTION_INVALID_REQUEST', 'planId required', 400);
        const idempotencyKey = req.headers['idempotency-key'] ? String(req.headers['idempotency-key']) : null;
        const created = await (0, payments_1.createSubscriptionCheckout)(db, {
            userId: user.id,
            planId,
            gateway: opts.paymentGateway,
            idempotencyKey,
        });
        await (0, audit_1.auditEvent)(db, {
            actorUserId: user.id,
            action: 'subscription.checkout',
            entityType: 'subscription',
            entityId: created.subscription.id,
            payload: { planId, gateway: opts.paymentGateway },
            traceId,
        });
        const gateway = (0, payments_1.createPaymentGatewayAdapter)({
            gatewayId: opts.paymentGateway,
            baseUrl: opts.paymentGatewayBaseUrl || opts.publicBaseUrl,
            webhookSecret: opts.paymentGatewayWebhookSecret,
            timeoutMs: opts.paymentGatewayTimeoutMs,
        });
        const callbackUrl = `${opts.publicBaseUrl}/api/v1/payments/${gateway.id}/callback`;
        let checkout;
        try {
            checkout = await gateway.createCheckout({
                paymentId: created.payment.id,
                amount: created.payment.amount,
                currency: created.payment.currency,
                callbackUrl,
            });
        }
        catch (e) {
            if (e instanceof http_1.ApiError)
                throw e;
            throw new http_1.ApiError('PAYMENT_PROVIDER_TIMEOUT', 'Provider checkout failed', 504, { message: String(e?.message || e) });
        }
        const payment = await (0, payments_1.attachGatewayRef)(db, {
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
    app.get('/api/v1/subscriptions/me', async (req) => {
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const r = await db.pool.query(`SELECT s.*, p.title as plan_title, c.slug as creator_slug, c.display_name as creator_display_name
         FROM subscriptions s
         JOIN plans p ON p.id=s.plan_id
         JOIN creators c ON c.id=s.creator_id
        WHERE s.user_id=$1
        ORDER BY s.created_at DESC
        LIMIT 100`, [user.id]);
        return { items: r.rows };
    });
    app.get('/api/v1/payments/me', async (req) => {
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const r = await db.pool.query(`SELECT p.*
         FROM payments p
        WHERE p.user_id=$1
        ORDER BY p.created_at DESC
        LIMIT 100`, [user.id]);
        return { items: r.rows };
    });
    app.get('/api/v1/payments/:id', async (req) => {
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const paymentId = String(req.params.id || '');
        if (!paymentId)
            throw new http_1.ApiError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
        const r = await db.pool.query(`SELECT p.*
         FROM payments p
        WHERE p.id=$1 AND p.user_id=$2`, [paymentId, user.id]);
        if (r.rowCount !== 1)
            throw new http_1.ApiError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
        return r.rows[0];
    });
    app.post('/api/v1/subscriptions/cancel', async (req) => {
        const traceId = String(req.traceId || '');
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const subscriptionId = String(req.body?.subscriptionId || '');
        if (!subscriptionId)
            throw new http_1.ApiError('SUBSCRIPTION_INVALID_REQUEST', 'subscriptionId required', 400);
        const existing = await db.pool.query(`SELECT * FROM subscriptions WHERE id=$1 AND user_id=$2`, [subscriptionId, user.id]);
        if (existing.rowCount !== 1)
            throw new http_1.ApiError('SUBSCRIPTION_NOT_FOUND', 'Subscription not found', 404);
        const current = existing.rows[0];
        if (current.status === 'CANCELED' || current.status === 'EXPIRED') {
            return { subscription: current, updated: false };
        }
        const updated = await db.pool.query(`UPDATE subscriptions
          SET status='CANCELED',
              canceled_at = COALESCE(canceled_at, now()),
              updated_at = now()
        WHERE id=$1 AND user_id=$2
      RETURNING *`, [subscriptionId, user.id]);
        await (0, audit_1.auditEvent)(db, {
            actorUserId: user.id,
            action: 'subscription.cancel',
            entityType: 'subscription',
            entityId: subscriptionId,
            payload: { previousStatus: current.status },
            traceId,
        });
        return { subscription: updated.rows[0], updated: true };
    });
    app.post('/api/v1/content', async (req) => {
        const traceId = String(req.traceId || '');
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const body = req.body || {};
        const creatorId = String(body.creatorId || '');
        const title = String(body.title || '');
        const storagePath = String(body.storagePath || '');
        const mimeType = String(body.mimeType || 'application/octet-stream');
        const sizeBytes = Number(body.sizeBytes || 0);
        if (!creatorId || !title || !storagePath) {
            throw new http_1.ApiError('CONTENT_INVALID_REQUEST', 'creatorId/title/storagePath required', 400);
        }
        const creator = await db.pool.query(`SELECT * FROM creators WHERE id=$1`, [creatorId]);
        if (creator.rowCount !== 1)
            throw new http_1.ApiError('CREATOR_NOT_FOUND', 'Creator not found', 404);
        if (creator.rows[0].user_id !== user.id)
            throw new http_1.ApiError('AUTH_FORBIDDEN', 'Forbidden', 403);
        const content = await db.pool.query(`INSERT INTO contents (creator_id, title, storage_path, mime_type, size_bytes, is_published)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING *`, [creatorId, title, storagePath, mimeType, sizeBytes]);
        await (0, audit_1.auditEvent)(db, {
            actorUserId: user.id,
            action: 'content.create',
            entityType: 'content',
            entityId: content.rows[0].id,
            payload: { creatorId, storagePath, mimeType, sizeBytes },
            traceId,
        });
        return content.rows[0];
    });
    app.post('/api/v1/content/:id/publish', async (req) => {
        const traceId = String(req.traceId || '');
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const contentId = String(req.params.id || '');
        const existing = await db.pool.query(`SELECT ct.*, c.user_id as owner_user_id
         FROM contents ct
         JOIN creators c ON c.id=ct.creator_id
        WHERE ct.id=$1`, [contentId]);
        if (existing.rowCount !== 1)
            throw new http_1.ApiError('CONTENT_NOT_FOUND', 'Content not found', 404);
        if (existing.rows[0].owner_user_id !== user.id)
            throw new http_1.ApiError('AUTH_FORBIDDEN', 'Forbidden', 403);
        const updated = await db.pool.query(`UPDATE contents
          SET is_published=true,
              updated_at=now()
        WHERE id=$1
      RETURNING *`, [contentId]);
        await (0, audit_1.auditEvent)(db, {
            actorUserId: user.id,
            action: 'content.publish',
            entityType: 'content',
            entityId: contentId,
            payload: {},
            traceId,
        });
        return updated.rows[0];
    });
    app.post('/api/v1/content/:id/access-token', async (req) => {
        const traceId = String(req.traceId || '');
        const token = getAuthToken(req);
        if (!token)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Missing token', 401);
        const user = await (0, auth_1.getUserBySession)(db, token);
        if (!user)
            throw new http_1.ApiError('AUTH_INVALID_TOKEN', 'Invalid token', 401);
        const contentId = String(req.params.id || '');
        const content = await db.pool.query(`SELECT * FROM contents WHERE id=$1 AND is_published=true`, [contentId]);
        if (content.rowCount !== 1)
            throw new http_1.ApiError('CONTENT_NOT_FOUND', 'Content not found', 404);
        const item = content.rows[0];
        const activeSub = await db.pool.query(`SELECT id
         FROM subscriptions
        WHERE user_id=$1 AND creator_id=$2 AND status='ACTIVE'
        LIMIT 1`, [user.id, item.creator_id]);
        if (activeSub.rowCount !== 1)
            throw new http_1.ApiError('CONTENT_FORBIDDEN', 'Active subscription required', 403);
        const ttl = Math.max(60, Math.min(3600, Number(req.body?.ttlSeconds || 600)));
        const payload = {
            contentId,
            userId: user.id,
            exp: Math.floor(Date.now() / 1000) + ttl,
        };
        const downloadToken = createDownloadToken(opts.sessionSecret, payload);
        const downloadUrl = `${opts.publicBaseUrl}/api/v1/download/${encodeURIComponent(downloadToken)}`;
        await (0, audit_1.auditEvent)(db, {
            actorUserId: user.id,
            action: 'content.access_token.issue',
            entityType: 'content',
            entityId: contentId,
            payload: { ttlSeconds: ttl },
            traceId,
        });
        return { token: downloadToken, expiresAt: new Date(payload.exp * 1000).toISOString(), downloadUrl };
    });
    app.get('/api/v1/download/*', async (req, reply) => {
        const traceId = String(req.traceId || '');
        const token = decodeURIComponent(String(req.params['*'] || req.params.token || ''));
        if (!token)
            throw new http_1.ApiError('CONTENT_FORBIDDEN', 'Invalid download token', 403);
        const parsed = verifyDownloadToken(opts.sessionSecret, token);
        const content = await db.pool.query(`SELECT * FROM contents WHERE id=$1 AND is_published=true`, [parsed.contentId]);
        if (content.rowCount !== 1)
            throw new http_1.ApiError('CONTENT_NOT_FOUND', 'Content not found', 404);
        const item = content.rows[0];
        const activeSub = await db.pool.query(`SELECT id
         FROM subscriptions
        WHERE user_id=$1 AND creator_id=$2 AND status='ACTIVE'
        LIMIT 1`, [parsed.userId, item.creator_id]);
        if (activeSub.rowCount !== 1)
            throw new http_1.ApiError('CONTENT_FORBIDDEN', 'Active subscription required', 403);
        const absolutePath = resolveStoragePath(opts.contentStorageRoot, String(item.storage_path));
        if (!fs_1.default.existsSync(absolutePath))
            throw new http_1.ApiError('CONTENT_NOT_FOUND', 'Content file not found', 404);
        await (0, audit_1.auditEvent)(db, {
            actorUserId: parsed.userId,
            action: 'content.download',
            entityType: 'content',
            entityId: parsed.contentId,
            payload: { storagePath: item.storage_path },
            traceId,
        });
        reply.header('content-type', String(item.mime_type || 'application/octet-stream'));
        reply.header('content-disposition', `attachment; filename="${String(item.title || 'content').replace(/"/g, '')}"`);
        return reply.send(fs_1.default.createReadStream(absolutePath));
    });
    // Mock gateway simulation: marks as paid and redirects to callback.
    app.get('/api/v1/mock-gateway/pay', async (req, reply) => {
        const paymentId = String(req.query?.paymentId || '');
        const callback = String(req.query?.callback || '');
        if (!paymentId || !callback)
            throw new http_1.ApiError('PAYMENT_CALLBACK_INVALID', 'Invalid mock gateway request', 400);
        const url = new URL(callback);
        url.searchParams.set('gateway_ref', `mock_${paymentId}`);
        url.searchParams.set('status', 'ok');
        reply.redirect(url.toString());
    });
    // Callback handler (GET for mock, POST for real gateways later).
    async function markWebhookReceipt(input) {
        const signature = String(input.headers['x-gateway-signature'] || '');
        const receiptSeed = [
            input.gateway,
            input.source,
            input.gatewayRef,
            signature,
            stablePairs(input.payload),
            stablePairs(input.headers),
        ].join('|');
        const receiptKey = (0, security_1.hmacSha256Base64Url)(opts.sessionSecret, receiptSeed);
        const r = await db.pool.query(`INSERT INTO webhook_receipts (gateway, gateway_ref, source, receipt_key, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (gateway, receipt_key) DO NOTHING
       RETURNING id`, [input.gateway, input.gatewayRef, input.source, receiptKey, JSON.stringify({ payload: input.payload, headers: input.headers })]);
        return r.rowCount === 1;
    }
    async function findPaymentByGatewayRef(gateway, gatewayRef) {
        const r = await db.pool.query(`SELECT * FROM payments WHERE gateway=$1 AND gateway_ref=$2`, [gateway, gatewayRef]);
        return r.rowCount === 1 ? r.rows[0] : null;
    }
    app.get('/api/v1/payments/:gateway/callback', async (req) => {
        const traceId = String(req.traceId || '');
        const gatewayId = String(req.params.gateway || '');
        const adapter = (0, payments_1.createPaymentGatewayAdapter)({
            gatewayId,
            baseUrl: opts.paymentGatewayBaseUrl || opts.publicBaseUrl,
            webhookSecret: opts.paymentGatewayWebhookSecret,
            timeoutMs: opts.paymentGatewayTimeoutMs,
        });
        const gatewayRef = String(req.query?.gateway_ref || '');
        if (!gatewayRef)
            throw new http_1.ApiError('PAYMENT_CALLBACK_INVALID', 'Missing gateway_ref', 400);
        const payload = normalizePayload(req.query || {});
        const headers = normalizeHeaders(req.headers || {});
        const verified = await adapter.verifyCallback({
            gatewayRef,
            payload,
            headers,
        });
        const isFirstReceipt = await markWebhookReceipt({
            gateway: adapter.id,
            gatewayRef,
            source: `callback:get:${adapter.id}`,
            payload,
            headers,
        });
        if (!isFirstReceipt) {
            const payment = await findPaymentByGatewayRef(adapter.id, gatewayRef);
            if (payment) {
                await (0, audit_1.auditEvent)(db, {
                    actorUserId: payment.user_id,
                    action: 'payment.callback_replay',
                    entityType: 'payment',
                    entityId: payment.id,
                    payload: { gateway: adapter.id, gatewayRef, method: 'GET' },
                    traceId,
                });
                return { ok: payment.status === 'SUCCEEDED', replayed: true, paymentId: payment.id, status: payment.status, result: 'replayed' };
            }
            return { ok: false, replayed: true, result: 'replayed' };
        }
        const applied = await (0, payments_1.applyPaymentResult)(db, {
            gateway: adapter.id,
            gatewayRef,
            result: verified.result,
            paidAt: verified.paidAt,
            raw: verified.raw,
            source: `callback:get:${adapter.id}`,
        });
        await (0, audit_1.auditEvent)(db, {
            actorUserId: applied.payment.user_id,
            action: verified.result === 'succeeded' ? 'payment.succeeded' : verified.result === 'pending' ? 'payment.pending' : 'payment.failed',
            entityType: 'payment',
            entityId: applied.payment.id,
            payload: { gateway: adapter.id, gatewayRef, result: verified.result, raw: verified.raw },
            traceId,
        });
        return { ok: verified.result === 'succeeded', paymentId: applied.payment.id, status: applied.payment.status, result: verified.result };
    });
    app.post('/api/v1/payments/:gateway/callback', async (req) => {
        const traceId = String(req.traceId || '');
        const gatewayId = String(req.params.gateway || '');
        const adapter = (0, payments_1.createPaymentGatewayAdapter)({
            gatewayId,
            baseUrl: opts.paymentGatewayBaseUrl || opts.publicBaseUrl,
            webhookSecret: opts.paymentGatewayWebhookSecret,
            timeoutMs: opts.paymentGatewayTimeoutMs,
        });
        const body = req.body || {};
        const gatewayRef = String(body.gateway_ref || body.gatewayRef || '');
        if (!gatewayRef)
            throw new http_1.ApiError('PAYMENT_CALLBACK_INVALID', 'Missing gateway_ref', 400);
        const payload = normalizePayload(body || {});
        const headers = normalizeHeaders(req.headers || {});
        const verified = await adapter.verifyCallback({
            gatewayRef,
            payload,
            headers,
        });
        const isFirstReceipt = await markWebhookReceipt({
            gateway: adapter.id,
            gatewayRef,
            source: `callback:post:${adapter.id}`,
            payload,
            headers,
        });
        if (!isFirstReceipt) {
            const payment = await findPaymentByGatewayRef(adapter.id, gatewayRef);
            if (payment) {
                await (0, audit_1.auditEvent)(db, {
                    actorUserId: payment.user_id,
                    action: 'payment.callback_replay',
                    entityType: 'payment',
                    entityId: payment.id,
                    payload: { gateway: adapter.id, gatewayRef, method: 'POST' },
                    traceId,
                });
                return { ok: payment.status === 'SUCCEEDED', replayed: true, paymentId: payment.id, status: payment.status, result: 'replayed' };
            }
            return { ok: false, replayed: true, result: 'replayed' };
        }
        const applied = await (0, payments_1.applyPaymentResult)(db, {
            gateway: adapter.id,
            gatewayRef,
            result: verified.result,
            paidAt: verified.paidAt,
            raw: verified.raw,
            source: `callback:post:${adapter.id}`,
        });
        await (0, audit_1.auditEvent)(db, {
            actorUserId: applied.payment.user_id,
            action: verified.result === 'succeeded' ? 'payment.succeeded' : verified.result === 'pending' ? 'payment.pending' : 'payment.failed',
            entityType: 'payment',
            entityId: applied.payment.id,
            payload: { gateway: adapter.id, gatewayRef, result: verified.result, raw: verified.raw },
            traceId,
        });
        return { ok: verified.result === 'succeeded', paymentId: applied.payment.id, status: applied.payment.status, result: verified.result };
    });
}
