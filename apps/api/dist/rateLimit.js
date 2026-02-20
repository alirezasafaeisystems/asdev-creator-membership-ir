"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBasicRateLimit = registerBasicRateLimit;
const http_1 = require("./http");
const buckets = new Map();
function registerBasicRateLimit(app, opts) {
    const windowMs = opts?.windowMs ?? 60_000;
    const max = opts?.max ?? 120;
    const policies = opts?.policies || [];
    function resolvePolicy(pathOnly) {
        for (const p of policies) {
            if (p.pattern.test(pathOnly))
                return p;
        }
        return null;
    }
    app.addHook('onRequest', async (req) => {
        const pathOnly = String(req.url || '').split('?')[0];
        const matched = resolvePolicy(pathOnly);
        const routeWindowMs = matched?.windowMs ?? windowMs;
        const routeMax = matched?.max ?? max;
        const key = `${req.ip}:${req.method}:${pathOnly}`;
        const now = Date.now();
        const b = buckets.get(key);
        if (!b || b.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + routeWindowMs });
            return;
        }
        b.count += 1;
        if (b.count > routeMax) {
            throw new http_1.ApiError('RATE_LIMITED', 'Too many requests', 429);
        }
    });
}
