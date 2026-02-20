import type { FastifyInstance } from 'fastify';
import { ApiError } from './http';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

type RatePolicy = { pattern: RegExp; max: number; windowMs?: number };

export function registerBasicRateLimit(app: FastifyInstance, opts?: { windowMs?: number; max?: number; policies?: RatePolicy[] }) {
  const windowMs = opts?.windowMs ?? 60_000;
  const max = opts?.max ?? 120;
  const policies = opts?.policies || [];

  function resolvePolicy(pathOnly: string) {
    for (const p of policies) {
      if (p.pattern.test(pathOnly)) return p;
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
      throw new ApiError('RATE_LIMITED', 'Too many requests', 429);
    }
  });
}
