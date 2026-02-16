import type { FastifyInstance } from 'fastify';
import { ApiError } from './http';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function registerBasicRateLimit(app: FastifyInstance, opts?: { windowMs?: number; max?: number }) {
  const windowMs = opts?.windowMs ?? 60_000;
  const max = opts?.max ?? 120;

  app.addHook('onRequest', async (req) => {
    const pathOnly = String(req.url || '').split('?')[0];
    const key = `${req.ip}:${req.method}:${pathOnly}`;
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    b.count += 1;
    if (b.count > max) {
      throw new ApiError('RATE_LIMITED', 'Too many requests', 429);
    }
  });
}
